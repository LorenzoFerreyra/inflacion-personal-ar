"use client";

import type { ChatMessage as ChatMessageType } from "@/lib/chat/types";

/**
 * Renderiza **negritas** dentro de una línea sin librería de markdown.
 */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-zinc-50">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Markdown mínimo para el MVP: negritas, listas con "- "/"• " y saltos
 * de línea. Sin dangerouslySetInnerHTML — todo son elementos React.
 */
function renderContent(content: string): React.ReactNode {
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
            <span>{renderInline(item)}</span>
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
            {renderInline(line)}
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
}: {
  message: ChatMessageType;
  isStreaming?: boolean;
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
        renderContent(message.content)
      ) : isStreaming ? (
        <p className="my-2 text-zinc-400">
          Buscando precios
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
