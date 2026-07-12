"use client";

import { useRef, useState } from "react";
import type { Priority } from "@/lib/chat/types";

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "price", label: "Mejor precio" },
  { value: "distance", label: "Más cerca" },
  { value: "balanced", label: "Balanceado" },
];

const MAX_TEXTAREA_HEIGHT = 200;

/**
 * Composer estilo Claude/ChatGPT: card redondeada con textarea auto-growing,
 * controles de prioridad/radio integrados abajo y botón circular de envío.
 */
export default function ChatInput({
  onSend,
  disabled,
  priority,
  onPriorityChange,
  radiusKm,
  onRadiusChange,
  autoFocus = false,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  priority: Priority;
  onPriorityChange: (p: Priority) => void;
  radiusKm: number | null;
  onRadiusChange: (km: number | null) => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [radiusOpen, setRadiusOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  };

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const canSend = !disabled && text.trim().length > 0;

  return (
    <div
      className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg shadow-black/20
                 focus-within:border-zinc-700"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          autoGrow();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        placeholder="Preguntale al asistente dónde conviene comprar…"
        aria-label="Mensaje para el asistente"
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5
                   text-[15px] leading-6 text-zinc-100 placeholder:text-zinc-400
                   focus:outline-none disabled:opacity-60"
        style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
      />

      <div className="flex items-center gap-1.5 px-2.5 pb-2.5 pt-1 flex-wrap">
        <div
          className="flex gap-0.5 rounded-lg bg-zinc-950/50 p-0.5"
          role="radiogroup"
          aria-label="Prioridad de la recomendación"
        >
          {PRIORITY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={priority === value}
              onClick={() => onPriorityChange(value)}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                priority === value
                  ? "bg-zinc-800 text-amber-300"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (radiusOpen) {
              onRadiusChange(null);
              setRadiusOpen(false);
            } else {
              onRadiusChange(radiusKm ?? 5);
              setRadiusOpen(true);
            }
          }}
          aria-pressed={radiusOpen}
          className={`rounded-md px-2 py-1 text-[11px] font-medium ${
            radiusOpen
              ? "bg-zinc-800 text-amber-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {radiusOpen ? `Radio ${radiusKm ?? 5} km ✕` : "Radio"}
        </button>

        {radiusOpen && (
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={radiusKm ?? 5}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-24 accent-amber-400"
            aria-label="Radio de búsqueda en kilómetros"
          />
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label="Enviar mensaje"
          className={`ml-auto flex size-8 shrink-0 items-center justify-center rounded-full ${
            canSend
              ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 12.5v-9M4 7l4-3.5L12 7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
