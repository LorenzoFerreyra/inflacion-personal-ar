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
  const dias = parseInt(params.get("dias") ?? "30", 10);
  const page = parseInt(params.get("page") ?? "1", 10);
  const pageSize = parseInt(params.get("pageSize") ?? "30", 10);

  // "eans" viene como string separado por comas: "123,456,789"
  const eansParam = params.get("eans");
  const eans = eansParam ? eansParam.split(",").filter(Boolean) : undefined;

  const products = getProducts({ search, category, dias, eans, page, pageSize });

  return NextResponse.json(products);
}
