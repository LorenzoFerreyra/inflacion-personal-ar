/**
 * format.ts — Formateo de números para la UI (convención es-AR: coma decimal).
 */

/**
 * Formatea una variación porcentual: "+10,5%" / "-3,2%" / "0,0%".
 */
export function fmtPct(value: number, withSign = true): string {
  const sign = withSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}
