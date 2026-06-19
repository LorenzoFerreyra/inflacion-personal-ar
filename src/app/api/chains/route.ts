/**
 * GET /api/chains?eans=123,456,789
 *
 * Devuelve el precio promedio de la canasta por cadena de supermercado.
 * Útil para comparar dónde conviene comprar.
 */

import { NextRequest, NextResponse } from "next/server";
import { getChainPrices } from "@/lib/database";
import { parseEans } from "@/lib/shared";

export async function GET(request: NextRequest) {
  const eansParam = request.nextUrl.searchParams.get("eans");

  if (!eansParam) {
    return NextResponse.json(
      { error: "El parámetro 'eans' es requerido" },
      { status: 400 },
    );
  }

  const eans = parseEans(eansParam);
  const chains = getChainPrices(eans);

  return NextResponse.json(chains);
}
