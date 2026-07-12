/**
 * types.ts — Tipos del chat de compras.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type Priority = "price" | "distance" | "balanced";

/** Producto que matcheó una keyword del usuario, con precio actual promedio. */
export interface MatchedProduct {
  ean: string;
  product_description: string;
  marca: string;
  precio_actual: number;
}

/** Precio de un producto en una cadena (última fecha disponible). */
export interface ChainProductPrice {
  ean: string;
  cadena: string;
  precio: number;
}

/**
 * Un ítem del pedido del usuario: la keyword que escribió ("arroz") y los
 * EANs candidatos que matchearon. El recomendador elige UNA variante por
 * cadena (la más barata disponible), no suma todas.
 */
export interface ProductRequest {
  keyword: string;
  eans: string[];
}

export interface NearestBranch {
  direccion: string;
  localidad: string;
  distancia_km: number;
}

/** Una cadena rankeada por el algoritmo de recomendación. */
export interface ChainRecommendation {
  cadena: string;
  score: number;
  total_precio: number;
  sucursal_cercana: NearestBranch | null;
  /** La variante más barata de cada keyword pedida que la cadena tiene. */
  productos: { keyword: string; ean: string; descripcion: string; precio: number }[];
  /** Keywords del pedido de las que la cadena no tiene ninguna variante. */
  faltantes: string[];
}

export interface Recommendation {
  cadenas: ChainRecommendation[];
  fecha_precios: string | null;
}
