/**
 * parse-request.ts — Validación del body de POST /api/chat.
 * Separado de la route para poder testearlo (Next.js no permite exports
 * extra en route.ts).
 */

import type { ChatMessage, Priority } from "./types";

export const MAX_MESSAGES = 30;
export const MAX_MESSAGE_LENGTH = 2000;

const PRIORITIES = new Set<string>(["price", "distance", "balanced"]);

export interface ChatRequestBody {
  messages: ChatMessage[];
  priority: Priority;
  radiusKm?: number;
}

/** Valida y normaliza el body del POST. Devuelve null si es inválido. */
export function parseBody(raw: unknown): ChatRequestBody | null {
  if (raw == null || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;

  if (!Array.isArray(body.messages) || body.messages.length === 0) return null;
  const messages: ChatMessage[] = [];
  for (const m of body.messages.slice(-MAX_MESSAGES)) {
    if (
      m == null ||
      typeof m !== "object" ||
      ((m as ChatMessage).role !== "user" &&
        (m as ChatMessage).role !== "assistant") ||
      typeof (m as ChatMessage).content !== "string"
    )
      return null;
    messages.push({
      role: (m as ChatMessage).role,
      content: (m as ChatMessage).content.slice(0, MAX_MESSAGE_LENGTH),
    });
  }
  if (messages[messages.length - 1].role !== "user") return null;

  const priority: Priority =
    typeof body.priority === "string" && PRIORITIES.has(body.priority)
      ? (body.priority as Priority)
      : "balanced";

  let radiusKm: number | undefined;
  if (typeof body.radiusKm === "number" && isFinite(body.radiusKm)) {
    radiusKm = Math.min(100, Math.max(0.5, body.radiusKm));
  }

  return { messages, priority, radiusKm };
}
