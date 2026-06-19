import { NextResponse } from "next/server";
import { getChainList } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json(getChainList());
  } catch {
    return NextResponse.json(
      { error: "Error al obtener lista de cadenas" },
      { status: 500 },
    );
  }
}
