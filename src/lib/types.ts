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

export interface IndecAggregate {
  fecha: string;
  mediana: number;
  min: number;
  max: number;
}

export interface IndecBrandGroup {
  marca: string;
  count: number;
  min_price: number;
  max_price: number;
}

export interface IndecLinksData {
  indec_ean: string;
  linked_count: number;
  aggregates: IndecAggregate[];
  byBrand: IndecBrandGroup[];
}

export interface IndecReferenceData {
  indec_ean: string | null;
  indec_price?: number | null;
  indec_description?: string | null;
  indec_history?: PricePoint[];
}
