/**
 * rateLimit.ts — Limitador de tasa simple en memoria.
 *
 * Usa un sliding window por IP. No apto para producción con múltiples instancias
 * (ahí se necesita Redis), pero suficiente para deployments single-instance.
 */

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

/** Limpia entradas viejas del store cada 5 minutos para evitar memory leaks. */
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Verifica si un request excede el límite.
 *
 * @param key — identificador único (ej: IP del cliente).
 * @param maxRequests — máximo de requests permitidos en la ventana.
 * @param windowMs — duración de la ventana en milisegundos.
 * @returns `true` si el request está permitido, `false` si debe rechazarse.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  cleanup(windowMs);

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remover timestamps fuera de la ventana
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}
