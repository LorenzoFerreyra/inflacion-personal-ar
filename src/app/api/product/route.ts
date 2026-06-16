import { NextRequest, NextResponse } from "next/server";
import { getProductByEan, getPriceStats } from "@/lib/database";

export async function GET(request: NextRequest) {
  const ean = request.nextUrl.searchParams.get("ean");

  if (!ean) {
    return NextResponse.json(
      { error: "El parámetro 'ean' es requerido" },
      { status: 400 }
    );
  }

  const product = getProductByEan(ean);
  if (!product) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const stats = getPriceStats(ean);

  return NextResponse.json({ product, stats });
}
