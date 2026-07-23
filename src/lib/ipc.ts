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

import { query } from "./database";
import { type IpcValues } from "./constants";

/**
 * Calcula las tres variaciones (mensual, trimestral, interanual) en una sola
 * pasada por la base de datos. Antes eran 3 queries separadas que cada una
 * re-escaneaba MAX(fecha) y recomputaba precio_actual desde cero.
 *
 * La query devuelve todas las variaciones individuales con sus 3 columnas.
 * Después en JS se calcula la mediana de cada columna por separado.
 */
/**
 * La base tiene dos regímenes de datos:
 *  - Scraper propio: cientos de miles de filas por día, desde mayo 2026.
 *  - Serie de referencia INDEC (cadena = 'indec'): 14 productos, un dato
 *    por mes, desde 2017.
 *
 * Cada período se calcula de forma independiente. Si dentro de la ventana
 * existe una fecha "densa" (datos del scraper) razonablemente cercana al
 * inicio de la ventana, se usa la mediana de variaciones de todos los
 * productos. Si no (p. ej. interanual, cuando el scraper todavía no tiene
 * un año de historia), se recurre a la serie mensual del INDEC comparando
 * los dos meses separados por la ventana.
 */

/** Mínimo de filas para considerar una fecha como "densa" (datos scraper). */
const DENSE_THRESHOLD = 1000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const val =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(val * 10) / 10;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

/** Mediana de variaciones % por producto entre dos fechas (todas las cadenas). */
function medianVariationBetween(baseDate: string, actualDate: string): number {
  const rows = query<{ v: number }>(`
    SELECT (pa.precio - pb.precio) / pb.precio * 100 AS v
    FROM (SELECT ean, AVG(precio_lista) AS precio FROM price_series
          WHERE fecha = ? AND precio_lista > 0 AND is_outlier = 0 GROUP BY ean) pa
    JOIN (SELECT ean, AVG(precio_lista) AS precio FROM price_series
          WHERE fecha = ? AND precio_lista > 0 AND is_outlier = 0 GROUP BY ean) pb
      USING (ean)
    WHERE pb.precio > 0
  `).all(actualDate, baseDate);
  return median(rows.map((r) => r.v));
}

/** Mediana de variaciones % de la serie INDEC entre dos fechas. */
function medianIndecVariationBetween(
  baseDate: string,
  actualDate: string,
): number {
  const rows = query<{ v: number }>(`
    SELECT (pa.precio - pb.precio) / pb.precio * 100 AS v
    FROM (SELECT ean, AVG(precio_lista) AS precio FROM price_series
          WHERE fecha = ? AND cadena = 'indec' AND precio_lista > 0 AND is_outlier = 0 GROUP BY ean) pa
    JOIN (SELECT ean, AVG(precio_lista) AS precio FROM price_series
          WHERE fecha = ? AND cadena = 'indec' AND precio_lista > 0 AND is_outlier = 0 GROUP BY ean) pb
      USING (ean)
    WHERE pb.precio > 0
  `).all(actualDate, baseDate);
  return median(rows.map((r) => r.v));
}

function computePeriod(
  days: number,
  dateCounts: { fecha: string; n: number }[],
  latest: string,
  indecDates: string[],
): number {
  const cutoff = addDays(latest, -days);

  // Fecha densa más antigua dentro de la ventana (excluyendo la actual).
  const denseBase = dateCounts.find(
    (d) => d.fecha >= cutoff && d.fecha < latest && d.n >= DENSE_THRESHOLD,
  )?.fecha;

  // La base densa sirve si no está demasiado lejos del inicio de la ventana
  // (si el scraper arrancó hace 2 meses, no puede representar "interanual").
  const slackDays = Math.max(7, days * 0.25);
  if (denseBase && daysBetween(cutoff, denseBase) <= slackDays) {
    return medianVariationBetween(denseBase, latest);
  }

  // Fallback: serie mensual del INDEC. Se compara el último mes disponible
  // contra el mes más cercano a (último - ventana).
  if (indecDates.length >= 2) {
    const actual = indecDates[indecDates.length - 1];
    const target = addDays(actual, -days);
    let base = indecDates[0];
    for (const d of indecDates) {
      if (
        d < actual &&
        daysBetween(d, target) < daysBetween(base, target)
      ) {
        base = d;
      }
    }
    if (base !== actual) return medianIndecVariationBetween(base, actual);
  }

  return 0;
}

function computeAllVariations(): {
  mensual: number;
  trimestral: number;
  interanual: number;
} {
  const dateCounts = query<{ fecha: string; n: number }>(
    "SELECT fecha, COUNT(*) AS n FROM price_series GROUP BY fecha ORDER BY fecha",
  ).all();
  if (dateCounts.length === 0) {
    return { mensual: 0, trimestral: 0, interanual: 0 };
  }

  const latest = dateCounts[dateCounts.length - 1].fecha;
  const indecDates = query<{ fecha: string }>(
    "SELECT DISTINCT fecha FROM price_series WHERE cadena = 'indec' ORDER BY fecha",
  )
    .all()
    .map((r) => r.fecha);

  return {
    mensual: computePeriod(30, dateCounts, latest, indecDates),
    trimestral: computePeriod(90, dateCounts, latest, indecDates),
    interanual: computePeriod(365, dateCounts, latest, indecDates),
  };
}

/**
 * Devuelve los tres valores de IPC calculados desde la base de datos.
 * Se cachea en memoria porque el cálculo recorre toda la tabla; el cache
 * se invalida cada 6 horas (suficiente dado que los datos se scrapean diariamente).
 * El cache vive en globalThis para sobrevivir HMR en desarrollo.
 */
const globalForIpcCache = globalThis as unknown as {
  // v2: se versiona la clave para descartar caches de la lógica anterior.
  __ipcCacheV2: { values: IpcValues; timestamp: number } | undefined;
};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export function getIpc(): IpcValues {
  const now = Date.now();
  const cached = globalForIpcCache.__ipcCacheV2;
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.values;
  }

  const values = computeAllVariations();

  // Un resultado totalmente nulo indica falta de datos; no vale la pena
  // fijarlo durante 6 horas.
  const degenerate =
    values.mensual === 0 && values.trimestral === 0 && values.interanual === 0;
  if (!degenerate) {
    globalForIpcCache.__ipcCacheV2 = { values, timestamp: now };
  }
  return values;
}
