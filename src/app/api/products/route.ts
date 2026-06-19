/**
 * GET /api/products
 *
 * Devuelve productos con precio actual y variación porcentual.
 *
 * Query params:
 *   - search: texto libre (busca en descripción y marca)
 *   - category: filtra por categoría exacta
 *   - dias: período de comparación (default: 30)
 *   - eans: lista de EANs separados por coma
 *   - page: número de página (default: 1)
 *   - pageSize: productos por página (default: 30)
 */

import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/database";
import { parseEans, clampInt } from "@/lib/shared";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const cadena = params.get("cadena") ?? "";
  const dias = clampInt(params.get("dias"), 1, 365, 30);
  const page = clampInt(params.get("page"), 1, Infinity, 1);
  const pageSize = clampInt(params.get("pageSize"), 1, 200, 30);

  const eansParam = params.get("eans");
  const eans = eansParam ? parseEans(eansParam) : undefined;

  try {
    const { products, total } = getProducts({
      search,
      category,
      cadena,
      dias,
      eans,
      page,
      pageSize,
    });

    return NextResponse.json({ products, total });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 },
    );
  }
}
