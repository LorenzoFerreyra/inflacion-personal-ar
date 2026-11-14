/**
 * variedades.ts — Precios promedio del INDEC por variedad contra los supermercados.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  De dónde sale (pipeline scrapers-uflo, load/variedades_pg.py)       │
 * │                                                                      │
 * │  El INDEC publica el precio promedio de 59 variedades en el GBA      │
 * │  ("Yerba mate, 500 g"). Cada producto del súper que es esa variedad  │
 * │  se lleva a la misma unidad (yerba de 1 kg = 2 unidades de 500 g).   │
 * │                                                                      │
 * │  - Precio del súper: mediana entre productos del precio por unidad   │
 * │    del INDEC, con el cuartil 25 y 75 para mostrar la dispersión.     │
 * │    Depende de qué marcas venda cada súper: es orientativo.           │
 * │  - Variación: cada producto contra sí mismo en la misma cadena, mes  │
 * │    contra mes. Es la comparación firme con el INDEC.                 │
 * │  - Disco, Jumbo y Vea entran solo con precios que coinciden con los  │
 * │    de otra cadena: parte de su catálogo tiene precios inválidos.     │
 * └──────────────────────────────────────────────────────────────────────┘
 */

export const REGION_VARIEDADES = "GBA";

/** Con menos productos el precio del súper es poco representativo. */
export const MIN_PRODUCTOS = 5;

export interface PuntoVariedad {
  periodo: string;
  precio_indec: number | null;
  var_indec: number | null;
  precio_p25: number | null;
  precio_mediana: number | null;
  precio_p75: number | null;
  var_super: number | null;
  n_productos: number | null;
  n_cadenas: number | null;
  n_pares: number | null;
}

/** Fila de la consulta: variedad x mes. */
export interface FilaVariedad extends PuntoVariedad {
  id: string;
  nombre: string;
  unidad: string;
  sin_reglas: string | null;
}

export interface Variedad {
  id: string;
  nombre: string;
  unidad: string;
  /** Por qué no se compara (variedades sin reglas), o null. */
  sin_reglas: string | null;
  puntos: PuntoVariedad[];
}

export interface PrecioProducto {
  ean: string;
  product_description: string;
  cadena: string;
  precio: number;
  entra: boolean;
}

export interface RespuestaVariedades {
  region: string;
  /** Primer mes: incompleto (los scrapers arrancan el 14 de mayo de 2026). */
  desde: string | null;
  ultimoMes: string | null;
  variedades: Variedad[];
}

export function agruparVariedades(filas: FilaVariedad[]): Variedad[] {
  const porId = new Map<string, Variedad>();
  for (const { id, nombre, unidad, sin_reglas, ...punto } of filas) {
    let v = porId.get(id);
    if (!v) {
      v = { id, nombre, unidad, sin_reglas, puntos: [] };
      porId.set(id, v);
    }
    v.puntos.push(punto);
  }
  const out = [...porId.values()];
  for (const v of out) v.puntos.sort((a, b) => a.periodo.localeCompare(b.periodo));
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Cuánto más caro (+) o barato (−) es el súper que el INDEC, en %, redondeado. */
export function diferenciaNivel(superMediana: number | null, indec: number | null): number | null {
  if (superMediana === null || indec === null || indec <= 0) return null;
  return Math.round((superMediana / indec - 1) * 100);
}

/** Punto de un mes, o null. */
export function puntoDe(v: Variedad, periodo: string): PuntoVariedad | null {
  return v.puntos.find((p) => p.periodo === periodo) ?? null;
}

/** Último mes con precio del INDEC y de algún súper. */
export function ultimoMesConDatos(variedades: Variedad[]): string | null {
  let mes: string | null = null;
  for (const v of variedades) {
    for (const p of v.puntos) {
      if (p.precio_indec !== null && p.precio_mediana !== null && (mes === null || p.periodo > mes)) {
        mes = p.periodo;
      }
    }
  }
  return mes;
}

/** "$ 2.079" sin decimales. */
export function fmtPesos(x: number | null): string {
  return x === null ? "—" : `$ ${Math.round(x).toLocaleString("es-AR")}`;
}
