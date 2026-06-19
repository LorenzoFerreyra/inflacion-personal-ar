/**
 * ipc.ts — Cálculo del IPC (índice de precios al consumidor) a partir de los
 * datos reales de price_series.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  ¿Cómo se calcula?                                                  │
 * │                                                                      │
 * │  Para cada período (mensual, trimestral, interanual):                │
 * │                                                                      │
 * │  1. Se toma la fecha más reciente con datos (fecha_actual) y la      │
 * │     fecha más antigua dentro del rango de días (fecha_base).         │
 * │                                                                      │
 * │  2. Para cada producto (EAN), se calcula el precio promedio entre    │
 * │     cadenas en fecha_actual y en fecha_base.                         │
 * │                                                                      │
 * │  3. Se calcula la variación porcentual individual de cada producto:  │
 * │        variacion = (precio_actual - precio_base) / precio_base * 100 │
 * │                                                                      │
 * │  4. El IPC es la mediana de todas esas variaciones individuales.     │
 * │     Se usa mediana (no promedio) para que los outliers — productos   │
 * │     con variaciones extremas por error de datos o discontinuidad —   │
 * │     no distorsionen el índice.                                       │
 * │                                                                      │
 * │  5. Solo se incluyen productos que tienen precio válido (>0) en      │
 * │     ambas fechas para evitar sesgos por productos nuevos o dados     │
 * │     de baja.                                                         │
 * │                                                                      │
 * │  Limitaciones:                                                       │
 * │  - No es el IPC oficial del INDEC (que usa una canasta ponderada     │
 * │    por participación en el gasto de los hogares).                    │
 * │  - Acá cada producto pesa igual. Es un índice "democrático" de      │
 * │    precios de supermercado, no una medida macroeconómica.            │
 * │  - La cobertura depende de los datos del scraper.                   │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import { prepare } from "./database";
import { type IpcValues } from "./constants";

/**
 * Calcula las tres variaciones (mensual, trimestral, interanual) en una sola
 * pasada por la base de datos. Antes eran 3 queries separadas que cada una
 * re-escaneaba MAX(fecha) y recomputaba precio_actual desde cero.
 *
 * La query devuelve todas las variaciones individuales con sus 3 columnas.
 * Después en JS se calcula la mediana de cada columna por separado.
 */
function computeAllVariations(): {
  mensual: number;
  trimestral: number;
  interanual: number;
} {
  const sql = `
    WITH
    fecha_actual AS (
      SELECT MAX(fecha) AS fecha FROM price_series
    ),
    precio_actual AS (
      SELECT ean, AVG(precio_lista) AS precio
      FROM price_series
      WHERE fecha = (SELECT fecha FROM fecha_actual)
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_30 AS (
      SELECT ean, AVG(precio_lista) AS precio
      FROM price_series
      WHERE fecha = (
        SELECT MIN(fecha) FROM price_series
        WHERE fecha >= DATE((SELECT fecha FROM fecha_actual), '-30 days')
      )
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_90 AS (
      SELECT ean, AVG(precio_lista) AS precio
      FROM price_series
      WHERE fecha = (
        SELECT MIN(fecha) FROM price_series
        WHERE fecha >= DATE((SELECT fecha FROM fecha_actual), '-90 days')
      )
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_365 AS (
      SELECT ean, AVG(precio_lista) AS precio
      FROM price_series
      WHERE fecha = (
        SELECT MIN(fecha) FROM price_series
        WHERE fecha >= DATE((SELECT fecha FROM fecha_actual), '-365 days')
      )
        AND precio_lista > 0
      GROUP BY ean
    )
    SELECT
      (pa.precio - p30.precio) / p30.precio * 100 AS var_30,
      (pa.precio - p90.precio) / p90.precio * 100 AS var_90,
      (pa.precio - p365.precio) / p365.precio * 100 AS var_365
    FROM precio_actual pa
    JOIN precio_30 p30 USING (ean)
    JOIN precio_90 p90 USING (ean)
    JOIN precio_365 p365 USING (ean)
    WHERE p30.precio > 0 AND p90.precio > 0 AND p365.precio > 0
  `;

  type Row = { var_30: number; var_90: number; var_365: number };
  const rows = prepare(sql).all() as Row[];

  function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const val =
      sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    return Math.round(val * 10) / 10;
  }

  if (rows.length === 0) return { mensual: 0, trimestral: 0, interanual: 0 };

  return {
    mensual: median(rows.map((r) => r.var_30)),
    trimestral: median(rows.map((r) => r.var_90)),
    interanual: median(rows.map((r) => r.var_365)),
  };
}

/**
 * Devuelve los tres valores de IPC calculados desde la base de datos.
 * Se cachea en memoria porque el cálculo recorre toda la tabla; el cache
 * se invalida cada 6 horas (suficiente dado que los datos se scrapean diariamente).
 * El cache vive en globalThis para sobrevivir HMR en desarrollo.
 */
const globalForIpcCache = globalThis as unknown as {
  __ipcCache: { values: IpcValues; timestamp: number } | undefined;
};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function getIpc(): IpcValues {
  const now = Date.now();
  const cached = globalForIpcCache.__ipcCache;
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.values;
  }

  const values = computeAllVariations();

  globalForIpcCache.__ipcCache = { values, timestamp: now };
  return values;
}
