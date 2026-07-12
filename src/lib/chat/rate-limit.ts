/**
 * rate-limit.ts — Rate limiting in-memory por IP para /api/chat.
 *
 * Ventana deslizante simple: protege el costo de las llamadas a DeepSeek
 * contra spam y scripts. In-memory alcanza para un deploy de una instancia;
 * si algún día hay múltiples instancias, mover a SQLite o Redis.
 */

const WINDOW_MS = 5 * 60_000;
const MAX_REQUESTS = 20;
const MAX_TRACKED_KEYS = 5000;

const globalForRateLimit = globalThis as unknown as {
  __chatRateLimit: Map<string, number[]> | undefined;
};

const hits: Map<string, number[]> =
  globalForRateLimit.__chatRateLimit ??
  (globalForRateLimit.__chatRateLimit = new Map());

/**
 * Registra un request de `key` y devuelve si está dentro del límite.
 * `now` es inyectable para tests.
 */
export function checkRateLimit(key: string, now = Date.now()): boolean {
  // Poda global para que el Map no crezca sin límite con IPs efímeras.
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, timestamps] of hits) {
      if (timestamps.every((t) => t <= now - WINDOW_MS)) hits.delete(k);
    }
  }

  const recent = (hits.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
