/**
 * shared.ts — Funciones de utilidad compartidas entre rutas de API.
 */

/**
 * Parsea un string de EANs separados por coma y devuelve un array limpio.
 */
export function parseEans(raw: string | null, maxItems = 200): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(isValidEan)
    .slice(0, maxItems);
}

/**
 * Valida que un string sea un identificador de producto válido:
 * numérico (EAN estándar) o con prefijo INDEC- (canasta básica).
 */
export function isValidEan(ean: string): boolean {
  return /^\d{1,14}$/.test(ean) || /^INDEC-[a-z0-9_]+$/.test(ean);
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
