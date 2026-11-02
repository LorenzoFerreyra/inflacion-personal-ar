/**
 * ipc.ts — IPC oficial del INDEC (nivel general, total nacional).
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  ¿De dónde sale?                                                    │
 * │                                                                      │
 * │  1. Se pide a la API del INDEC (/v1/ipc_nacional) la serie del       │
 * │     índice base dic-2016=100. Requiere INDEC_API_TOKEN.              │
 * │                                                                      │
 * │  2. Las tres variaciones salen de la misma serie, comparando el      │
 * │     último mes publicado contra 1, 3 y 12 meses antes:               │
 * │        variacion = (indice_actual / indice_base - 1) * 100           │
 * │                                                                      │
 * │  Limitaciones:                                                       │
 * │  - El INDEC publica una vez por mes, con unas dos semanas de         │
 * │    rezago: el dato siempre es del último mes cerrado y publicado.    │
 * │  - Por redondeo, un valor puede diferir en 0,1 del informe técnico.  │
 * └──────────────────────────────────────────────────────────────────────┘
 */

import { PERIODS, type IpcValues, type PeriodKey } from "./constants";

const INDEC_IPC_URL = "https://api.indec.gob.ar/v1/ipc_nacional";
const REQUEST_TIMEOUT_MS = 10_000;

const MONTHS_BACK: Record<PeriodKey, number> = {
  mensual: 1,
  trimestral: 3,
  interanual: 12,
};

export interface IndecRow {
  periodo: string;
  valor: number | null;
}

/** Mueve un período AAAAMM una cantidad de meses hacia atrás. */
export function subtractMonths(periodo: string, months: number): string {
  const year = Number(periodo.slice(0, 4));
  const month = Number(periodo.slice(4, 6));
  const total = year * 12 + (month - 1) - months;
  const shifted = (total % 12) + 1;
  return `${Math.floor(total / 12)}${String(shifted).padStart(2, "0")}`;
}

/**
 * Calcula las tres variaciones a partir de la serie del índice.
 *
 * Los filtros de la API deben dejar una sola serie. Si para un mismo período
 * llegan valores distintos se está mezclando más de una, y mostrar cualquiera
 * de ellos como "IPC oficial" sería peor que no mostrar nada.
 */
export function variationsFromIndex(rows: IndecRow[]): IpcValues {
  const byPeriodo = new Map<string, number>();
  for (const { periodo, valor } of rows) {
    if (valor === null) continue;
    const existing = byPeriodo.get(periodo);
    if (existing !== undefined && existing !== valor) {
      throw new Error(`INDEC: más de una serie para el período ${periodo}`);
    }
    byPeriodo.set(periodo, valor);
  }
  if (byPeriodo.size === 0) throw new Error("INDEC: serie del IPC vacía");

  const latest = [...byPeriodo.keys()].sort().at(-1)!;
  const actual = byPeriodo.get(latest)!;

  const variation = (key: PeriodKey): number => {
    const base = byPeriodo.get(subtractMonths(latest, MONTHS_BACK[key]));
    if (!base) {
      throw new Error(`INDEC: falta la base ${PERIODS[key].label} de ${latest}`);
    }
    return Math.round((actual / base - 1) * 1000) / 10;
  };

  return {
    mensual: variation("mensual"),
    trimestral: variation("trimestral"),
    interanual: variation("interanual"),
  };
}

async function fetchIndexSeries(): Promise<IndecRow[]> {
  const token = process.env.INDEC_API_TOKEN;
  if (!token) throw new Error("INDEC_API_TOKEN no está configurado");

  const params = new URLSearchParams({
    select: "periodo,valor",
    // "ndice" cubre índice/Índice/indice sin depender de tildes ni mayúsculas.
    tipo_de_indicador: "ilike.*ndice*",
    descripcion: "ilike.*nivel general*",
    region: "ilike.*nacional*",
    order: "periodo.desc",
    limit: "1000",
  });

  const res = await fetch(`${INDEC_IPC_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`INDEC: HTTP ${res.status}`);
  return res.json();
}

/**
 * Devuelve los tres valores del IPC oficial. El dato cambia una vez por mes,
 * así que se cachea en memoria 6 horas. Si el INDEC no responde se sigue
 * sirviendo el último dato bueno. El cache vive en globalThis para sobrevivir
 * HMR en desarrollo.
 */
const globalForIpcCache = globalThis as unknown as {
  // v3: se versiona la clave para descartar caches del cálculo anterior.
  __ipcCacheV3: { values: IpcValues; timestamp: number } | undefined;
};
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function getIpc(): Promise<IpcValues> {
  const now = Date.now();
  const cached = globalForIpcCache.__ipcCacheV3;
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.values;
  }

  try {
    const values = variationsFromIndex(await fetchIndexSeries());
    globalForIpcCache.__ipcCacheV3 = { values, timestamp: now };
    return values;
  } catch (err) {
    if (cached) return cached.values;
    throw err;
  }
}
