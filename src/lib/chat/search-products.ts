/**
 * search-products.ts — Búsqueda de productos para el chat de compras.
 *
 * Reusa la búsqueda fuzzy de database.ts (cache in-memory con
 * normalización de acentos y matching por tokens). No duplica lógica.
 */

import { getProducts } from "@/lib/database";
import type { MatchedProduct } from "./types";

const MAX_RESULTS_PER_KEYWORD = 5;

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
    pageSize: MAX_RESULTS_PER_KEYWORD,
  });

  return products.map((p) => ({
    ean: p.ean,
    product_description: p.product_description,
    marca: p.marca,
    precio_actual: p.precio_actual,
  }));
}
