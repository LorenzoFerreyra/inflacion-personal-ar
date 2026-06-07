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
}

export interface PricePoint {
  fecha: string;
  precio_promedio: number;
}

export interface ChainPrice {
  cadena: string;
  precio_promedio_canasta: number;
}

export interface Category {
  categoria: string;
  n: number;
}
