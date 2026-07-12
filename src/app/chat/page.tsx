"use client";

/**
 * /chat — Chat de compra inteligente.
 *
 * Interfaz estilo Claude/ChatGPT: columna de conversación centrada y angosta,
 * mensajes del asistente como prosa (sin burbuja), composer redondeado fijo
 * abajo. Empty state con saludo y sugerencias. Historial solo en memoria del
 * cliente: se pierde al recargar.
 */

import { useEffect, useRef, useState } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import type { ChatMessage as Message, Priority } from "@/lib/chat/types";

const SUGGESTIONS = [
  "Necesito arroz, aceite y carne picada, vivo en Caballito",
  "¿Dónde conviene comprar yerba y azúcar cerca de Palermo?",
  "¿Cuánto sale la leche en cada supermercado?",
];

/** Parsea los eventos SSE acumulados y devuelve el texto + resto sin consumir. */
function drainSse(buffer: string): { text: string; rest: string; done: boolean } {
  let text = "";
  let done = false;
  const events = buffer.split("\n\n");
  const rest = events.pop() ?? "";
  for (const event of events) {
    for (const line of event.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        done = true;
        continue;
      }
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed.content === "string") text += parsed.content;
      } catch {
        // chunk malformado: ignorar
      }
    }
  }
  return { text, rest, done };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState<Priority>("balanced");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      // Durante el streaming llegan muchos chunks: scroll instantáneo evita jitter.
      behavior: loading ? "auto" : "smooth",
    });
  }, [messages, loading]);

  const send = async (text: string) => {
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setLoading(true);

    const appendToAssistant = (chunk: string) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          priority,
          ...(radiusKm != null ? { radiusKm } : {}),
        }),
      });

      if (!res.ok || !res.body) {
        let error = "No pude procesar tu consulta, intentá de nuevo.";
        try {
          const data = await res.json();
          if (typeof data.error === "string") error = data.error;
        } catch {
          // sin body JSON: usar el mensaje genérico
        }
        appendToAssistant(error);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const drained = drainSse(buffer);
        buffer = drained.rest;
        if (drained.text) appendToAssistant(drained.text);
        if (drained.done) break;
      }
    } catch {
      appendToAssistant("Se cortó la conexión, intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const composer = (
    <ChatInput
      onSend={send}
      disabled={loading}
      priority={priority}
      onPriorityChange={setPriority}
      radiusKm={radiusKm}
      onRadiusChange={setRadiusKm}
      autoFocus
    />
  );

  // ── Empty state: saludo centrado con el composer y sugerencias ─────────────
  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-[calc(100dvh-13rem)] min-h-[420px] md:h-[calc(100dvh-10rem)] w-full max-w-2xl flex-col justify-center pb-16">
        <h1 className="font-display text-3xl font-semibold text-gradient text-balance">
          ¿Dónde conviene comprar hoy?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">
          Decime qué productos necesitás y en qué zona estás. Comparo los
          precios relevados en cada cadena y te recomiendo dónde comprar.
        </p>

        <div className="mt-8">{composer}</div>

        <div className="mt-6 flex flex-col gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="w-fit rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3.5 py-2
                         text-left text-[13px] text-zinc-300
                         hover:border-zinc-700 hover:text-zinc-100"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Conversación activa: mensajes arriba, composer fijo abajo ──────────────
  return (
    <div className="mx-auto flex h-[calc(100dvh-13rem)] min-h-[420px] md:h-[calc(100dvh-10rem)] w-full max-w-2xl flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto pb-6 pr-1"
        aria-live="polite"
        aria-label="Conversación con el asistente"
      >
        {messages.map((m, i) => (
          <ChatMessage
            key={i}
            message={m}
            isStreaming={loading && i === messages.length - 1 && m.role === "assistant"}
          />
        ))}
      </div>

      <div className="shrink-0 pt-2">
        {composer}
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Precios del relevamiento diario del observatorio. Verificá en la
          sucursal antes de comprar.
        </p>
      </div>
    </div>
  );
}
