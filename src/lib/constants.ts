/**
 * constants.ts — Valores de referencia para la app
 *
 * IPC: índices oficiales de inflación (INDEC) para comparar con la canasta personal.
 * PERIODS: mapeo entre nombre legible y cantidad de días para cada período.
 */

export const IPC = {
  mensual: 8.8,
  trimestral: 26.5,
  interanual: 118.4,
} as const;

export type PeriodKey = keyof typeof IPC;

export const PERIODS: Record<PeriodKey, { label: string; dias: number }> = {
  mensual: { label: "Mensual", dias: 30 },
  trimestral: { label: "Trimestral", dias: 90 },
  interanual: { label: "Interanual", dias: 365 },
};

export const PAGE_SIZE = 30;
