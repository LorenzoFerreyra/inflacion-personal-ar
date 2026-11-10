/**
 * GET /api/periodos
 *
 * Qué períodos tienen precios comparables. Antes del primer mes del índice
 * por clase los precios de Disco, Jumbo y Vea tenían otra escala, así que un
 * período que empieza antes no se puede calcular.
 */

import { NextResponse } from "next/server";
import { PERIOD_KEYS, PERIODS, type PeriodKey } from "@/lib/constants";
import { sumarMeses } from "@/lib/canasta";
import { getMesesIndice, periodoComparable } from "@/lib/database";
import type { RespuestaPeriodos } from "@/lib/types";

export async function GET() {
  try {
    const { base, ultimo } = await getMesesIndice();
    const porDias = await Promise.all(PERIOD_KEYS.map((k) => periodoComparable(PERIODS[k].dias)));
    const disponibles = Object.fromEntries(
      PERIOD_KEYS.map((k, i) => [
        k,
        porDias[i] && !!base && !!ultimo && sumarMeses(ultimo, -PERIODS[k].meses) >= base,
      ]),
    ) as Record<PeriodKey, boolean>;
    return NextResponse.json<RespuestaPeriodos>({ desde: base, ultimoMes: ultimo, disponibles });
  } catch (err) {
    console.error("Error al obtener los períodos:", err);
    return NextResponse.json({ error: "Error al obtener los períodos" }, { status: 500 });
  }
}
