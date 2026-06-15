/**
 * constants.ts — Valores de referencia para la app
 *
 * PERIODS: mapeo entre nombre legible y cantidad de días para cada período.
 */

export type PeriodKey = "mensual" | "trimestral" | "interanual";

export type IpcValues = Record<PeriodKey, number>;

export const PERIODS: Record<PeriodKey, { label: string; dias: number }> = {
  mensual: { label: "Mensual", dias: 30 },
  trimestral: { label: "Trimestral", dias: 90 },
  interanual: { label: "Interanual", dias: 365 },
};

export const PAGE_SIZE = 30;
