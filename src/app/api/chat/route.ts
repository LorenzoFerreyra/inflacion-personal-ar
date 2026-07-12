/**
 * POST /api/chat — Chat de compra inteligente.
 *
 * Orquesta el flujo completo:
 *   A) clasificación + extracción de productos y ubicación (DeepSeek, JSON mode)
 *      — si la consulta está fuera de tema, responde un mensaje fijo sin
 *        gastar la segunda llamada (guardrail de alcance)
 *   B) búsqueda fuzzy de productos en el catálogo (SQLite)
 *   C) geocodificación de la ubicación (Nominatim)
 *   D) ranking de cadenas (recommend, una variante por keyword)
 *   E) respuesta conversacional con los datos inyectados (DeepSeek, stream SSE)
 *
 * Guardrails: rate limit por IP, validación estricta del body, prompts con
 * alcance cerrado (ver src/lib/chat/prompts.ts y sus evals).
 * La API key de DeepSeek solo vive server-side.
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { searchProducts } from "@/lib/chat/search-products";
import { geocode } from "@/lib/chat/geocode";
import { recommend } from "@/lib/chat/recommend";
import { CHAT_MODEL, extractIntent, type Extraction } from "@/lib/chat/extract";
import { OFF_TOPIC_REPLY, SYSTEM_PROMPT } from "@/lib/chat/prompts";
import { parseBody } from "@/lib/chat/parse-request";
import { checkRateLimit } from "@/lib/chat/rate-limit";
import type { MatchedProduct } from "@/lib/chat/types";

function getClient(): OpenAI | null {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
}

function buildContextMessage(
  extraction: Extraction,
  matches: { keyword: string; productos: MatchedProduct[] }[],
  recommendation: ReturnType<typeof recommend> | null,
  geocodeFailed: boolean,
): string {
  return [
    "Datos del sistema para responder la última consulta (no los muestres crudos, usalos para redactar):",
    JSON.stringify(
      {
        interpretacion: extraction,
        geocoding_fallo: geocodeFailed,
        productos_encontrados: matches,
        recomendacion: recommendation,
      },
      null,
      2,
    ),
  ].join("\n");
}

function sseEncode(payload: string): Uint8Array {
  return new TextEncoder().encode(
    `data: ${JSON.stringify({ content: payload })}\n\n`,
  );
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

/** Respuesta SSE con un texto fijo, sin llamar al modelo. */
function cannedSse(text: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sseEncode(text));
      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

export async function POST(request: NextRequest) {
  const client = getClient();
  if (!client) {
    return Response.json(
      { error: "El asistente no está configurado (falta DEEPSEEK_API_KEY)." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Demasiadas consultas seguidas. Esperá unos minutos e intentá de nuevo." },
      { status: 429 },
    );
  }

  let body: ReturnType<typeof parseBody> = null;
  try {
    body = parseBody(await request.json());
  } catch {
    // body queda null y se responde 400 abajo
  }
  if (!body) {
    return Response.json({ error: "Formato de mensaje inválido." }, { status: 400 });
  }
  const { messages, priority, radiusKm } = body;

  try {
    // A) Clasificar y extraer productos + ubicación del mensaje natural.
    const extraction = await extractIntent(client, messages);

    // Guardrail de alcance: fuera de tema → respuesta fija, sin segunda llamada.
    if (!extraction.es_consulta_valida) {
      return cannedSse(OFF_TOPIC_REPLY);
    }

    // B) Buscar cada keyword en el catálogo.
    const matches = extraction.productos.map((keyword) => ({
      keyword,
      productos: searchProducts(keyword),
    }));
    const items = matches
      .map((m) => ({ keyword: m.keyword, eans: m.productos.map((p) => p.ean) }))
      .filter((i) => i.eans.length > 0);

    // C) Geocodificar si hay ubicación. Si Nominatim falla, seguimos sin geo.
    let coords: { lat: number; lng: number } | null = null;
    let geocodeFailed = false;
    if (extraction.ubicacion) {
      coords = await geocode(extraction.ubicacion);
      geocodeFailed = coords == null;
    }

    // D) Rankear cadenas (una variante por keyword, la más barata por cadena).
    const recommendation =
      items.length > 0
        ? recommend(items, coords?.lat, coords?.lng, priority, radiusKm)
        : null;

    // E) Respuesta conversacional streameada con los datos inyectados.
    const completion = await client.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        {
          role: "system",
          content: buildContextMessage(
            extraction,
            matches,
            recommendation,
            geocodeFailed,
          ),
        },
        { role: "user", content: messages[messages.length - 1].content },
      ],
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(sseEncode(delta));
          }
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        } catch {
          controller.enqueue(
            sseEncode("\n\nSe cortó la respuesta, intentá de nuevo."),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch {
    return Response.json(
      { error: "No pude procesar tu consulta, intentá de nuevo." },
      { status: 502 },
    );
  }
}
