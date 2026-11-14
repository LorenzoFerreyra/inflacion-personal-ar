"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "@/components/EmptyState";
import { fmtMes } from "@/lib/canasta";
import { fmtPct } from "@/lib/format";
import type { SerieComparada } from "@/lib/indices";

const COLOR_PROPIO = "#e0a535";
const COLOR_INDEC = "#a78bfa";

interface Props {
  serie: SerieComparada;
  region: string;
  height?: number;
}

/**
 * Índice propio y del INDEC para el mismo código, los dos con base 100 en
 * nuestro primer mes, mostrados como aumento acumulado (índice − 100) para que
 * se lea en porcentaje. Si el INDEC no tiene el mes base, va solo el propio.
 */
export default function IndexChart({ serie, region, height = 260 }: Props) {
  if (serie.puntos.length < 2) {
    return <EmptyState message="Hace falta más de un mes para graficar." />;
  }

  const hayIndec = serie.puntos.some((p) => p.indec !== null);
  const data = serie.puntos.map((p) => ({
    periodo: p.periodo,
    propio: Math.round((p.propio - 100) * 100) / 100,
    indec: p.indec === null ? null : Math.round((p.indec - 100) * 100) / 100,
    propio_var: p.propio_var,
    indec_var: p.indec_var,
  }));
  const valores = data.flatMap((d) => (d.indec === null ? [d.propio] : [d.propio, d.indec]));
  // El acumulado arranca en 0: el eje siempre lo incluye.
  const min = Math.min(0, Math.floor(Math.min(...valores)));
  const max = Math.ceil(Math.max(...valores) + 0.5);
  // Marcas parejas en el eje (cada 1, 2 o 5 puntos según el rango).
  const paso = max - min <= 6 ? 1 : max - min <= 12 ? 2 : 5;
  const ticks: number[] = [];
  for (let t = Math.floor(min / paso) * paso; ticks.at(-1) === undefined || ticks.at(-1)! < max; t += paso) {
    ticks.push(t);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR_PROPIO }} />
          Supermercados
        </span>
        {hayIndec && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 border-t-2 border-dashed"
              style={{ borderColor: COLOR_INDEC }}
            />
            INDEC {region}
          </span>
        )}
        <span className="text-zinc-500">aumento acumulado desde {fmtMes(data[0].periodo)}</span>
      </div>
      <div role="img" aria-label={`Índice de ${serie.nombre}: supermercados${hayIndec ? " e INDEC" : ""}`}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="periodo"
              tickFormatter={fmtMes}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
            />
            <YAxis
              domain={[ticks[0], ticks.at(-1)!]}
              ticks={ticks}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
              tickFormatter={(v: number) => fmtPct(v, true).replace(",0%", "%")}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#121214",
                border: "1px solid #3f3f46",
                borderRadius: "4px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#a1a1aa", fontSize: "11px" }}
              labelFormatter={(v) => fmtMes(String(v))}
              formatter={(value, name, item) => {
                const p = item.payload as (typeof data)[number];
                const v = name === "propio" ? p.propio_var : p.indec_var;
                const etiqueta = name === "propio" ? "Supermercados" : `INDEC ${region}`;
                const variacion = v === null ? "" : ` · ${fmtPct(v)} en el mes`;
                return [`${fmtPct(Number(value))} acumulado${variacion}`, etiqueta];
              }}
            />
            <Line
              type="monotone"
              dataKey="propio"
              stroke={COLOR_PROPIO}
              strokeWidth={2}
              dot={{ r: 3, fill: COLOR_PROPIO, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            {hayIndec && (
              <Line
                type="monotone"
                dataKey="indec"
                stroke={COLOR_INDEC}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, fill: COLOR_INDEC, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
