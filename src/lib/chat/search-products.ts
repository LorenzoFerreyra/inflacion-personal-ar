/**
 * search-products.ts — Búsqueda de productos para el chat de compras.
 *
 * Reusa la búsqueda fuzzy de database.ts (matching por substring sin
 * acentos) y re-rankea para el chat: la búsqueda por substring hace que
 * "azúcar" traiga "bizcochos azucarados", que después se sumaría al total
 * como si fuera azúcar. Acá se prioriza el producto que ES lo pedido.
 */

import { getProducts } from "@/lib/database";
import type { MatchedProduct } from "./types";

const MAX_RESULTS_PER_KEYWORD = 5;
const CANDIDATES = 60;

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 0 = la descripción empieza con lo pedido ("azucar ledesma 1 kg"),
 * 1 = lo pedido aparece como palabra completa ("yerba mate amanda"),
 * 2 = solo como parte de otra palabra ("bizcochos azucarados").
 * Acepta plural/singular simple (huevo/huevos, limon/limones).
 */
export function matchTier(description: string, keyword: string): 0 | 1 | 2 {
  const desc = normalize(description);
  const kw = normalize(keyword);
  if (!kw) return 2;
  // Formas base posibles: tomates→tomate, limones→limon, huevos→huevo.
  const forms = [...new Set([kw, kw.replace(/s$/, ""), kw.replace(/es$/, "")])]
    .filter(Boolean)
    .map(escapeRegex);
  const word = `(?:${forms.join("|")})(?:es|s)?(?![a-z0-9])`;
  if (new RegExp(`^${word}`).test(desc)) return 0;
  if (new RegExp(`(?<![a-z0-9])${word}`).test(desc)) return 1;
  return 2;
}

/**
 * Busca productos del catálogo que matcheen lo que escribió el usuario
 * (ej: "carne picada"). Devuelve hasta 5 resultados con precio actual.
 */
export async function searchProducts(query: string): Promise<MatchedProduct[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { products } = await getProducts({
    search: trimmed,
    page: 1,
    pageSize: CANDIDATES,
  });

  // Orden estable por tier: dentro de cada tier se respeta el orden de la
  // base (más cobertura de cadenas primero).
  const ranked = products
    .map((p, i) => ({ p, i, tier: matchTier(p.product_description, trimmed) }))
    .sort((a, b) => a.tier - b.tier || a.i - b.i);

  // Si hay coincidencias de palabra completa, descartar las parciales.
  const best = ranked.some((r) => r.tier < 2)
    ? ranked.filter((r) => r.tier < 2)
    : ranked;

  return best.slice(0, MAX_RESULTS_PER_KEYWORD).map(({ p }) => ({
    ean: p.ean,
    product_description: p.product_description,
    marca: p.marca,
    precio_actual: p.precio_actual,
  }));
}
