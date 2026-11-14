import { NextRequest, NextResponse } from "next/server";
import { getProductByEan, getPriceStats } from "@/lib/database";
import { isValidEan, parseDias, DIAS_PERIODOS } from "@/lib/shared";

export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean");
  const dias = parseDias(request.nextUrl.searchParams.get("dias"));
  if (dias === null) {
    return NextResponse.json(
      { error: `'dias' tiene que ser ${DIAS_PERIODOS.join(", ")}` },
      { status: 400 },
    );
  }

  if (!ean || !isValidEan(ean)) {
    return NextResponse.json(
      {
        error:
          "El parámetro 'ean' es requerido y debe ser numérico (1-14 dígitos)",
      },
      { status: 400 },
    );
  }

  try {
    const product = await getProductByEan(ean, dias);
    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    const stats = await getPriceStats(ean);
    return NextResponse.json({ product, stats });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener producto" },
      { status: 500 },
    );
  }
}
