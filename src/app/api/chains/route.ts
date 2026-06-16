/**
 * GET /api/chains?eans=123,456,789
 *
 * Devuelve el precio promedio de la canasta por cadena de supermercado.
 * Útil para comparar dónde conviene comprar.
 */

import { NextRequest, NextResponse } from "next/server";
import { getChainPrices } from "@/lib/database";

export async function GET(request: NextRequest) {
  const eansParam = request.nextUrl.searchParams.get("eans");

  if (!eansParam) {
    return NextResponse.json(
      { error: "El parámetro 'eans' es requerido" },
      { status: 400 },
    );
  }

  const eans = eansParam
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^\d{1,14}$/.test(e))
    .slice(0, 200);
  const chains = getChainPrices(eans);

  return NextResponse.json(chains);
}
