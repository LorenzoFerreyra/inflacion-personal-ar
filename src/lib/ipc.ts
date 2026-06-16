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

import { getDb } from "./database";
import type { PeriodKey, IpcValues } from "./constants";

const PERIOD_DAYS: Record<PeriodKey, number> = {
  mensual: 30,
  trimestral: 90,
  interanual: 365,
};

/**
 * Calcula la variación porcentual mediana de todos los productos
 * entre fecha_base (la más antigua dentro del rango) y fecha_actual
 * (la más reciente con datos).
 */
function computeVariation(dias: number): number {
  const sql = `
    WITH
    fecha_actual AS (
      SELECT MAX(fecha) AS fecha FROM price_series
    ),
    fecha_base AS (
      SELECT MIN(fecha) AS fecha
      FROM price_series
      WHERE fecha >= DATE((SELECT fecha FROM fecha_actual), '-' || ? || ' days')
    ),
    precio_actual AS (
      SELECT ean, AVG(precio_lista) AS precio
      FROM price_series
      WHERE fecha = (SELECT fecha FROM fecha_actual)
        AND precio_lista > 0
      GROUP BY ean
    ),
    precio_base AS (
      SELECT ean, AVG(precio_lista) AS precio
      FROM price_series
      WHERE fecha = (SELECT fecha FROM fecha_base)
        AND precio_lista > 0
      GROUP BY ean
    ),
    variaciones AS (
      SELECT
        (pa.precio - pb.precio) / pb.precio * 100 AS variacion
      FROM precio_actual pa
      JOIN precio_base pb USING (ean)
      WHERE pb.precio > 0
    )
    SELECT variacion
    FROM variaciones
    ORDER BY variacion
  `;

  const rows = getDb().prepare(sql).all(dias) as { variacion: number }[];

  if (rows.length === 0) return 0;

  const mid = Math.floor(rows.length / 2);
  const median =
    rows.length % 2 === 1
      ? rows[mid].variacion
      : (rows[mid - 1].variacion + rows[mid].variacion) / 2;

  return Math.round(median * 10) / 10;
}

/**
 * Devuelve los tres valores de IPC calculados desde la base de datos.
 * Se cachea en memoria porque el cálculo recorre toda la tabla; el cache
 * se invalida cada 6 horas (suficiente dado que los datos se scrapean diariamente).
 */
let cached: { values: IpcValues; timestamp: number } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function getIpc(): IpcValues {
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.values;
  }

  const values: IpcValues = {
    mensual: computeVariation(PERIOD_DAYS.mensual),
    trimestral: computeVariation(PERIOD_DAYS.trimestral),
    interanual: computeVariation(PERIOD_DAYS.interanual),
  };

  cached = { values, timestamp: now };
  return values;
}
