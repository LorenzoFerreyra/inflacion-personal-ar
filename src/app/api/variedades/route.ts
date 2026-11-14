/**
 * GET /api/variedades
 *
 * Precio promedio del INDEC (GBA) y de los supermercados por variedad y mes.
 * Ver src/lib/variedades.ts.
 */

import { NextResponse } from "next/server";
import { getVariedades } from "@/lib/database";

export async function GET() {
  try {
    return NextResponse.json(await getVariedades());
  } catch (err) {
    console.error("Error al obtener las variedades:", err);
    return NextResponse.json({ error: "Error al obtener las variedades" }, { status: 500 });
  }
}
