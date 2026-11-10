"use client";

import { fmtMes } from "@/lib/canasta";
import { fmtPct } from "@/lib/format";
import {
  diferenciaPp,
  mesDeComparacion,
  type ComparacionIndices,
} from "@/lib/indices";

interface Props {
  data: ComparacionIndices;
  onSelect?: (codigo: string) => void;
}

/** Explica por qué todavía no hay ningún mes para comparar con el INDEC. */
export function motivoSinComparacion(data: ComparacionIndices): string {
  if (!data.base) return "Todavía no hay meses cerrados con precios comparables.";
  if (!data.ultimoMesIndec || data.ultimoMesIndec < data.base) {
    return (
      `La serie del INDEC cargada llega a ${data.ultimoMesIndec ? fmtMes(data.ultimoMesIndec) : "ningún mes"} ` +
      `y nuestros índices empiezan en ${fmtMes(data.base)}. La comparación aparece cuando se cargue la serie actualizada.`
    );
  }
  return "Ninguna serie tiene todavía un mes con variación propia y del INDEC.";
}

/**
 * Variación mensual de cada serie comparable contra la del INDEC con el mismo
 * código, todas en el mismo mes.
 */
export default function ComparacionClases({ data, onSelect }: Props) {
  const mes = mesDeComparacion(data);
  if (!mes) {
    return (
      <p className="text-[13px] text-zinc-400 border border-dashed border-hairline-strong rounded-sm p-4 leading-relaxed">
        {motivoSinComparacion(data)}
      </p>
    );
  }

  const filas = data.series
    .filter((s) => s.comparable)
    .map((s) => ({ serie: s, punto: s.puntos.find((p) => p.periodo === mes) }))
    .filter(({ punto }) => punto && punto.propio_var !== null && punto.indec_var !== null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="text-left text-[11px] text-zinc-500 pb-2">
          Variación de {fmtMes(mes)} · INDEC región {data.region}
        </caption>
        <thead>
          <tr className="border-b border-hairline-strong">
            <th className="py-2 px-2 text-left text-[11px] font-bold text-zinc-400 uppercase">Apertura</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Súper</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">INDEC</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Dif. pp</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(({ serie, punto }) => {
            const dif = diferenciaPp(punto!.propio_var!, punto!.indec_var!);
            return (
              <tr
                key={serie.codigo}
                onClick={onSelect ? () => onSelect(serie.codigo) : undefined}
                className={`border-b border-hairline ${onSelect ? "hover:bg-panel-2 cursor-pointer" : ""}`}
              >
                <td className="py-2 px-2 text-[13px] text-zinc-200">
                  <span className="text-zinc-500 tabular mr-2">{serie.codigo}</span>
                  {serie.nombre}
                </td>
                <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-200">
                  {fmtPct(punto!.propio_var!)}
                </td>
                <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-400">
                  {fmtPct(punto!.indec_var!)}
                </td>
                <td
                  className={`py-2 px-2 text-right tabular text-[13px] font-bold ${
                    dif > 0 ? "text-red-400" : dif < 0 ? "text-green-400" : "text-zinc-400"
                  }`}
                >
                  {fmtPct(dif).replace("%", "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
