/**
 * constants.ts — Valores de referencia para la app
 *
 * PERIODS: para cada período, los días de la variación por producto y los
 * meses calendario de las comparaciones con el INDEC.
 */

export type PeriodKey = "mensual" | "trimestral" | "interanual";

export type IpcValues = Record<PeriodKey, number>;

export const PERIODS: Record<PeriodKey, { label: string; dias: number; meses: number }> = {
  mensual: { label: "Mensual", dias: 30, meses: 1 },
  trimestral: { label: "Trimestral", dias: 90, meses: 3 },
  interanual: { label: "Interanual", dias: 365, meses: 12 },
};

export const PERIOD_KEYS = Object.keys(PERIODS) as PeriodKey[];

export const PAGE_SIZE = 30;

export const MAX_COMPARE_PRODUCTS = 4;
export const MAX_PRICE_TABLE_ROWS = 30;
export const MAX_CHAIN_COLUMNS = 6;
