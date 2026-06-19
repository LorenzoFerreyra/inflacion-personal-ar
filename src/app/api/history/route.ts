/**
 * GET /api/history?ean=7791234567890
 *
 * Devuelve la serie histórica de precios para un producto.
 * Cada punto es la media geométrica de precios ese día (entre cadenas).
 */

import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory, getPriceHistoryByChain } from "@/lib/database";
import { isValidEan } from "@/lib/shared";

export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean");

  if (!ean || !isValidEan(ean)) {
    return NextResponse.json(
      {
        error:
          "El parámetro 'ean' es requerido y debe ser numérico (1-14 dígitos)",
      },
      { status: 400 },
    );
  }

  const average = getPriceHistory(ean);
  const rawByChain = getPriceHistoryByChain(ean);

  const byChain: Record<string, { fecha: string; precio: number }[]> = {};
  for (const row of rawByChain) {
    if (!byChain[row.cadena]) byChain[row.cadena] = [];
    byChain[row.cadena].push({ fecha: row.fecha, precio: row.precio });
  }

  return NextResponse.json({ average, byChain });
}
