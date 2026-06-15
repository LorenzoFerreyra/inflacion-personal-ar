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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  const dias = Math.min(365, Math.max(1, parseInt(params.get("dias") ?? "30", 10) || 30));
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(params.get("pageSize") ?? "30", 10) || 30));

  // "eans" viene como string separado por comas: "123,456,789"
  const eansParam = params.get("eans");
  const eans = eansParam
    ? eansParam.split(",").map((e) => e.trim()).filter((e) => /^\d{1,14}$/.test(e)).slice(0, 200)
    : undefined;

  const products = getProducts({ search, category, dias, eans, page, pageSize });

  return NextResponse.json(products);
}
