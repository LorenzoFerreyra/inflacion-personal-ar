"use client";

import Link from "next/link";
import type { ChatMessage as ChatMessageType } from "@/lib/chat/types";

/** Solo enlaces internos del sitio ("/explorador"); el resto queda como texto. */
const INTERNAL_LINK = /\[([^\]]+)\]\((\/[a-z0-9\-/#?=&]*)\)/gi;

/** Renderiza **negritas** dentro de un fragmento sin librería de markdown. */
function renderBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-zinc-50">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/** Negritas + enlaces internos [texto](/ruta). */
function renderInline(text: string, onNavigate?: () => void): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INTERNAL_LINK)) {
    const idx = m.index ?? 0;
    nodes.push(...renderBold(text.slice(last, idx), `t${idx}`));
    nodes.push(
      <Link
        key={`l${idx}`}
        href={m[2]}
        onClick={onNavigate}
        className="text-amber-300 underline decoration-amber-450/60 underline-offset-2 hover:text-amber-200"
      >
        {m[1]}
      </Link>,
    );
    last = idx + m[0].length;
  }
  nodes.push(...renderBold(text.slice(last), "end"));
  return nodes;
}

/**
 * Markdown mínimo para el MVP: negritas, listas con "- "/"• " y saltos
 * de línea. Sin dangerouslySetInnerHTML — todo son elementos React.
 */
function renderContent(content: string, onNavigate?: () => void): React.ReactNode {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-2 space-y-1.5">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-[9px] size-1 shrink-0 rounded-full bg-amber-400" />
            <span>{renderInline(item, onNavigate)}</span>
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const listMatch = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
    } else {
      flushList();
      if (line.trim()) {
        blocks.push(
          <p key={`p-${blocks.length}`} className="my-2 first:mt-0 last:mb-0">
            {renderInline(line, onNavigate)}
          </p>,
        );
      }
    }
  }
  flushList();
  return blocks;
}

/**
 * Fila de mensaje estilo Claude/ChatGPT: el usuario en burbuja compacta a la
 * derecha; el asistente como prosa a ancho completo de la columna, sin burbuja.
 */
export default function ChatMessage({
  message,
  isStreaming = false,
  onNavigate,
}: {
  message: ChatMessageType;
  isStreaming?: boolean;
  /** Se llama al tocar un enlace interno (ej: para cerrar el panel en mobile). */
  onNavigate?: () => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] whitespace-pre-wrap rounded-md bg-panel-2 border border-hairline
                     px-4 py-2.5 text-[15px] leading-6 text-zinc-100 md:max-w-[70%]"
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="text-[15px] leading-7 text-zinc-200">
      {message.content ? (
        renderContent(message.content, onNavigate)
      ) : isStreaming ? (
        <p className="my-2 text-zinc-400">
          Pensando
          <span className="inline-flex gap-0.5 pl-1 align-baseline">
            <span className="size-1 animate-pulse rounded-full bg-zinc-400" />
            <span
              className="size-1 animate-pulse rounded-full bg-zinc-400"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-1 animate-pulse rounded-full bg-zinc-400"
              style={{ animationDelay: "300ms" }}
            />
          </span>
        </p>
      ) : null}
      {isStreaming && message.content && (
        <span
          className="ml-0.5 inline-block h-4 w-[3px] translate-y-[2px] animate-pulse rounded-sm bg-amber-400"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
