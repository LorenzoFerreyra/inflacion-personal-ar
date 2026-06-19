/**
 * shared.ts — Funciones de utilidad compartidas entre rutas de API.
 */

/**
 * Parsea un string de EANs separados por coma y devuelve un array limpio.
 * Cada EAN se valida como numérico de 1 a 14 dígitos.
 */
export function parseEans(raw: string | null, maxItems = 200): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^\d{1,14}$/.test(e))
    .slice(0, maxItems);
}

/**
 * Valida que un string sea un EAN válido (1-14 dígitos numéricos).
 */
export function isValidEan(ean: string): boolean {
  return /^\d{1,14}$/.test(ean);
}

/**
 * Clampa y parsea un parámetro numérico de query string.
 */
export function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = parseInt(raw ?? "", 10);
  if (isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
