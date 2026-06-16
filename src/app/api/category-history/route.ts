import { NextRequest, NextResponse } from "next/server";
import { getCategoryPriceHistory } from "@/lib/database";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");

  if (!category) {
    return NextResponse.json(
      { error: "El parámetro 'category' es requerido" },
      { status: 400 }
    );
  }

  const history = getCategoryPriceHistory(category);

  return NextResponse.json(history);
}
