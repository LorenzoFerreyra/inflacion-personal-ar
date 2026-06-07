/**
 * GET /api/history?ean=7791234567890
 *
 * Devuelve la serie histórica de precios para un producto.
 * Cada punto es la media geométrica de precios ese día (entre cadenas).
 */

import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/database";

export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean");

  if (!ean) {
    return NextResponse.json(
      { error: "El parámetro 'ean' es requerido" },
      { status: 400 }
    );
  }

  const history = getPriceHistory(ean);
  return NextResponse.json(history);
}
