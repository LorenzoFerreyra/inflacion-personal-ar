import { NextRequest, NextResponse } from "next/server";
import {
  getLinkedEansForIndec,
  getIndecEanForProduct,
  getIndecLinkedAggregates,
  getIndecLinkedByBrand,
  getPriceHistory,
} from "@/lib/database";
import { isValidEan } from "@/lib/shared";

export async function GET(request: NextRequest) {
  const indecEan = request.nextUrl.searchParams.get("indec_ean");
  const canonEan = request.nextUrl.searchParams.get("canon_ean");

  if (!indecEan && !canonEan) {
    return NextResponse.json(
      { error: "Se requiere 'indec_ean' o 'canon_ean'" },
      { status: 400 },
    );
  }

  try {
    if (indecEan) {
      if (!isValidEan(indecEan)) {
        return NextResponse.json({ error: "EAN inválido" }, { status: 400 });
      }

      const linkedEans = getLinkedEansForIndec(indecEan);
      const aggregates = getIndecLinkedAggregates(indecEan);
      const byBrand = getIndecLinkedByBrand(indecEan);

      return NextResponse.json({
        indec_ean: indecEan,
        linked_count: linkedEans.length,
        aggregates,
        byBrand,
      });
    }

    if (canonEan) {
      if (!isValidEan(canonEan)) {
        return NextResponse.json({ error: "EAN inválido" }, { status: 400 });
      }

      const indecLinked = getIndecEanForProduct(canonEan);
      if (!indecLinked) {
        return NextResponse.json({ indec_ean: null });
      }

      const indecHistory = getPriceHistory(indecLinked);
      const lastPoint = indecHistory.at(-1);

      return NextResponse.json({
        indec_ean: indecLinked,
        indec_price: lastPoint ? Math.round(lastPoint.precio_promedio) : null,
        indec_history: indecHistory,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Error al obtener links INDEC" },
      { status: 500 },
    );
  }
}
