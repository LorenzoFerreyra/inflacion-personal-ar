/**
 * GET /api/categories
 *
 * Lista de categorías de productos con la cantidad de productos en cada una.
 */

import { NextResponse } from "next/server";
import { getCategories } from "@/lib/database";

export async function GET() {
  try {
    const categories = getCategories();
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 },
    );
  }
}
