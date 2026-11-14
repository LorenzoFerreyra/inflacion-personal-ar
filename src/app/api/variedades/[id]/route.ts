/**
 * GET /api/variedades/<id>
 *
 * Productos del súper que forman el precio de una variedad en el último mes,
 * con su precio por unidad del INDEC y si entraron en el cálculo.
 */

import { NextRequest, NextResponse } from "next/server";
import { getVariedadPrecios } from "@/lib/database";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9_]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Variedad inválida" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getVariedadPrecios(id));
  } catch (err) {
    console.error("Error al obtener los productos de la variedad:", err);
    return NextResponse.json({ error: "Error al obtener los productos" }, { status: 500 });
  }
}
