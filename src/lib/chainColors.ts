/**
 * chainColors.ts — Dynamically assigns colors to supermarket chains.
 *
 * Uses deterministic hashing so the same chain name always gets
 * the same color without any hardcoded mapping.
 */

/** Hash function using multiplier 31 (hash * 31 + char, via shift: (hash << 5) - hash). */
export function djb2Hash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

const CHAIN_COLORS = [
  "#6ee7b7",
  "#7dd3fc",
  "#c4b5fd",
  "#fca5a5",
  "#fcd34d",
  "#f0abfc",
  "#a5f3fc",
  "#fda4af",
  "#86efac",
  "#a78bfa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#60a5fa",
  "#34d399",
];

const globalForColorCache = globalThis as unknown as {
  __colorCache: Map<string, string> | undefined;
  __labelCache: Map<string, string> | undefined;
};

const colorCache: Map<string, string> =
  globalForColorCache.__colorCache ??
  (globalForColorCache.__colorCache = new Map());

/** Returns a consistent color for any chain name, derived from its hash. */
export function chainColor(name: string): string {
  const cached = colorCache.get(name);
  if (cached) return cached;

  const hash = djb2Hash(name);
  const idx =
    ((hash % CHAIN_COLORS.length) + CHAIN_COLORS.length) % CHAIN_COLORS.length;
  const color = CHAIN_COLORS[idx];
  colorCache.set(name, color);
  return color;
}

const LABEL_CACHE: Map<string, string> =
  globalForColorCache.__labelCache ??
  (globalForColorCache.__labelCache = new Map());

/** Converts a chain id like "chango_mas" to a display label like "Chango Más". */
export function chainLabel(id: string): string {
  const cached = LABEL_CACHE.get(id);
  if (cached) return cached;

  const label = id
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  LABEL_CACHE.set(id, label);
  return label;
}
