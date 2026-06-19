import { NextRequest, NextResponse } from "next/server";
import { getCategoryPriceHistory } from "@/lib/database";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  if (!category || category.length > 200) {
    return NextResponse.json(
      { error: "El parámetro 'category' es requerido (máximo 200 caracteres)" },
      { status: 400 }
    );
  }

  try {
    const history = getCategoryPriceHistory(category);
    return NextResponse.json(history);
  } catch {
    return NextResponse.json(
      { error: "Error al obtener historial de categoría" },
      { status: 500 },
    );
  }
}
