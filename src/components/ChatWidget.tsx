"use client";

/**
 * Asistente de compras como widget flotante (abajo a la derecha), estilo chat
 * web. Botón circular que abre un panel; en mobile el panel ocupa la pantalla.
 * Historial solo en memoria del cliente: sobrevive a cerrar el panel y a
 * navegar entre tabs, se pierde al recargar.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import type { ChatMessage as Message, Priority } from "@/lib/chat/types";

const SUGGESTIONS = [
  "¿Dónde compro más barato yerba y azúcar?",
  "Necesito arroz, aceite y carne picada, vivo en Caballito",
  "¿Qué puedo hacer en esta página?",
];

type LocationState =
  | { status: "none" }
  | { status: "loading" }
  | { status: "set"; lat: number; lng: number }
  | { status: "error"; message: string };

/** Parsea los eventos SSE acumulados y devuelve el texto + resto sin consumir. */
function drainSse(buffer: string): {
  text: string;
  rest: string;
  done: boolean;
  askLocation: boolean;
} {
  let text = "";
  let done = false;
  let askLocation = false;
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
        if (parsed.meta?.ask_location === true) askLocation = true;
      } catch {
        // chunk malformado: ignorar
      }
    }
  }
  return { text, rest, done, askLocation };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState<Priority>("balanced");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "none" });
  // Índice del mensaje del asistente que pidió la ubicación (muestra el botón).
  const [askLocationAt, setAskLocationAt] = useState<number | null>(null);
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      // Durante el streaming llegan muchos chunks: scroll instantáneo evita jitter.
      behavior: loading ? "auto" : "smooth",
    });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (
    text: string,
    coordsOverride?: { lat: number; lng: number },
  ) => {
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setAskLocationAt(null);
    setLoading(true);
    const coords =
      coordsOverride ??
      (location.status === "set"
        ? { lat: location.lat, lng: location.lng }
        : undefined);

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
          pagina: pathname,
          ...(radiusKm != null ? { radiusKm } : {}),
          ...(coords ? { coords } : {}),
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
        if (drained.askLocation) setAskLocationAt(history.length);
        if (drained.done) break;
      }
    } catch {
      appendToAssistant("Se cortó la conexión, intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /** Pide la ubicación al navegador. Si `thenSend`, reenvía la consulta con ella. */
  const requestLocation = (thenSend: boolean) => {
    if (!("geolocation" in navigator)) {
      setLocation({ status: "error", message: "Tu navegador no permite compartir ubicación." });
      return;
    }
    setLocation({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation({ status: "set", ...c });
        if (thenSend) send("Usá mi ubicación actual", c);
      },
      () =>
        setLocation({
          status: "error",
          message: "No pude obtener tu ubicación. Escribime tu barrio o localidad.",
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Asistente de compras"
          className="fixed inset-0 z-[60] flex flex-col bg-zinc-950
                     sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px]
                     sm:rounded-md sm:border sm:border-hairline-strong sm:shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-semibold text-zinc-50">
                Asistente de compras
              </p>
              <p className="text-[11px] text-zinc-500">
                Dónde conviene comprar, según precios relevados
              </p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                disabled={loading}
                className="rounded-sm px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
              >
                Nueva
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="flex size-8 items-center justify-center rounded-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d="M2 2l10 10M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto px-4 py-4"
            aria-live="polite"
            aria-label="Conversación con el asistente"
          >
            {messages.length === 0 ? (
              <div>
                <p className="text-[14px] leading-relaxed text-zinc-400">
                  Decime qué productos necesitás y en qué zona estás: comparo
                  los precios relevados en cada cadena y te digo dónde te
                  conviene comprar. También te explico cómo funciona el sitio
                  y de dónde salen los datos.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="w-fit rounded-sm border border-hairline bg-panel px-3 py-2
                                 text-left text-[13px] text-zinc-300
                                 hover:border-hairline-strong hover:text-zinc-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i}>
                  <ChatMessage
                    message={m}
                    isStreaming={loading && i === messages.length - 1 && m.role === "assistant"}
                    onNavigate={() => {
                      // En mobile el panel tapa la página: cerrarlo al navegar.
                      if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
                    }}
                  />
                  {askLocationAt === i && !loading && (
                    <button
                      type="button"
                      onClick={() => requestLocation(true)}
                      disabled={location.status === "loading"}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-amber-450 px-3 py-2
                                 text-[13px] font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
                    >
                      <PinIcon />
                      {location.status === "loading" ? "Obteniendo ubicación…" : "Usar mi ubicación"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-hairline px-3 pb-3 pt-3">
            <ChatInput
              onSend={send}
              disabled={loading}
              priority={priority}
              onPriorityChange={setPriority}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              location={location.status}
              onLocationToggle={() =>
                location.status === "set"
                  ? setLocation({ status: "none" })
                  : requestLocation(false)
              }
              autoFocus
            />
            {location.status === "error" && (
              <p className="mt-2 text-[11px] text-red-400" role="status">
                {location.message}
              </p>
            )}
            <p className="mt-2 text-center text-[10px] text-zinc-500">
              Verificá el precio en la sucursal antes de comprar.
            </p>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente de compras"}
        aria-expanded={open}
        className={`fixed bottom-6 right-6 z-[60] size-14 items-center justify-center rounded-full
                    bg-amber-450 text-zinc-950 shadow-xl hover:bg-amber-400
                    ${open ? "hidden sm:flex" : "flex"}`}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9a1.5 1.5 0 01-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 014 14.5v-9z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 14.5s4.5-4.2 4.5-8a4.5 4.5 0 10-9 0c0 3.8 4.5 8 4.5 8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.5" r="1.6" fill="currentColor" />
    </svg>
  );
}
