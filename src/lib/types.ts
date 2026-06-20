/**
 * types.ts — Tipos compartidos entre componentes del frontend.
 * Espejan los tipos del backend (database.ts).
 */

export interface Product {
  ean: string;
  product_description: string;
  marca: string;
  categoria: string;
  precio_actual: number;
  variacion_pct: number | null;
  cobertura_cadenas: number;
  image_url: string | null;
}

export interface PricePoint {
  fecha: string;
  precio_promedio: number;
}

export interface PriceHistoryData {
  average: PricePoint[];
  byChain: Record<string, { fecha: string; precio: number }[]>;
}

export interface ChainPrice {
  cadena: string;
  total_canasta: number;
}

export interface Category {
  categoria: string;
  n: number;
}

export interface Branch {
  cadena: string;
  formato: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  provincia: string;
  localidad: string;
}
