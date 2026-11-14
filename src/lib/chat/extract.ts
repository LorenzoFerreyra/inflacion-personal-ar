/**
 * extract.ts — Primera llamada al modelo: clasifica si la consulta está en
 * tema y extrae productos + ubicación como JSON estructurado.
 * Compartido entre la API route y los evals.
 */

import type OpenAI from "openai";
import { EXTRACT_PROMPT } from "./prompts";
import type { ChatMessage } from "./types";

export const CHAT_MODEL = "deepseek-chat";

export type Intencion = "donde_comprar" | "sitio" | "otro";

export interface Extraction {
  es_consulta_valida: boolean;
  /** Dónde comprar → ranking de cadenas; sitio → guiar a la sección de la UI. */
  intencion: Intencion;
  productos: string[];
  ubicacion: string | null;
  /** El usuario dijo que no quiere dar ubicación / que no importa la zona. */
  ubicacion_rechazada: boolean;
}

export async function extractIntent(
  client: OpenAI,
  messages: ChatMessage[],
): Promise<Extraction> {
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: EXTRACT_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 300,
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    return {
      // Ante un JSON malformado, fail-open al modelo (que también está
      // hardeneado por system prompt) en vez de rebotar consultas legítimas.
      es_consulta_valida: parsed.es_consulta_valida !== false,
      intencion:
        parsed.intencion === "sitio" || parsed.intencion === "otro"
          ? parsed.intencion
          : "donde_comprar",
      productos: Array.isArray(parsed.productos)
        ? parsed.productos
            .filter((p: unknown) => typeof p === "string")
            .slice(0, 15)
        : [],
      ubicacion:
        typeof parsed.ubicacion === "string" && parsed.ubicacion.trim()
          ? parsed.ubicacion.trim()
          : null,
      ubicacion_rechazada: parsed.ubicacion_rechazada === true,
    };
  } catch {
    return {
      es_consulta_valida: true,
      intencion: "otro",
      productos: [],
      ubicacion: null,
      ubicacion_rechazada: false,
    };
  }
}
