/**
 * GET /api/categories
 *
 * Lista de categorías de productos con la cantidad de productos en cada una.
 */

import { NextResponse } from "next/server";
import { getCategories } from "@/lib/database";

export async function GET() {
  const categories = getCategories();
  return NextResponse.json(categories);
}
