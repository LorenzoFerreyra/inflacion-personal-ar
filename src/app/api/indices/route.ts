/**
 * GET /api/indices
 *
 * Índices propios por clase COICOP, grupo y división, cada uno al lado de la
 * serie del INDEC con el mismo código (región GBA). Ver src/lib/indices.ts.
 */

import { NextResponse } from "next/server";
import { getComparacionIndices } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json(await getComparacionIndices());
  } catch (err) {
    console.error("Error al obtener los índices por clase:", err);
    return NextResponse.json(
      { error: "Error al obtener los índices por clase" },
      { status: 500 },
    );
  }
}
