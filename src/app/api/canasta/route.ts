/**
 * GET /api/canasta?eans=123,456&meses=1
 *
 * Inflación de una canasta entre el último mes cerrado y `meses` antes, y la
 * del INDEC (GBA) para las mismas clases y los mismos meses. Ver src/lib/canasta.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { calcularCanasta, fmtMes, sumarMeses, type RespuestaCanasta } from "@/lib/canasta";
import {
  getIndecClases,
  getMesesIndice,
  getRelativosCanasta,
  getUltimoMesIndec,
} from "@/lib/database";
import { REGION_INDEC } from "@/lib/indices";
import { clampInt, parseEans } from "@/lib/shared";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const eans = parseEans(params.get("eans"));
  if (eans.length === 0) {
    return NextResponse.json({ error: "El parámetro 'eans' es requerido" }, { status: 400 });
  }
  const meses = clampInt(params.get("meses"), 1, 12, 1);

  try {
    const { base, ultimo } = await getMesesIndice();
    if (!base || !ultimo) {
      return NextResponse.json<RespuestaCanasta>({
        disponible: false,
        motivo: "Todavía no hay meses cerrados con precios comparables.",
      });
    }
    const desde = sumarMeses(ultimo, -meses);
    if (desde < base) {
      return NextResponse.json<RespuestaCanasta>({
        disponible: false,
        motivo:
          `Hay precios comparables desde ${fmtMes(base)} y el último mes cerrado es ${fmtMes(ultimo)}: ` +
          `no alcanza para comparar ${meses} mes${meses === 1 ? "" : "es"}.`,
      });
    }

    const [relativos, indec, ultimoMesIndec] = await Promise.all([
      getRelativosCanasta(eans, desde, ultimo),
      getIndecClases(REGION_INDEC, desde, ultimo),
      getUltimoMesIndec(REGION_INDEC),
    ]);
    return NextResponse.json<RespuestaCanasta>({
      disponible: true,
      ...calcularCanasta(eans, relativos, indec.ln, indec.publicadas, desde, ultimo, ultimoMesIndec),
    });
  } catch (err) {
    console.error("Error al calcular la canasta:", err);
    return NextResponse.json({ error: "Error al calcular la canasta" }, { status: 500 });
  }
}
