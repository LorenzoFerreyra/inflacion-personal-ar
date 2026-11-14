"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EmptyState from "@/components/EmptyState";
import { fmtMes } from "@/lib/canasta";
import { fmtPesos, type Variedad } from "@/lib/variedades";

const COLOR_SUPER = "#e0a535";
const COLOR_INDEC = "#a78bfa";

/** Precio del INDEC y mediana del súper (con la banda del cuartil 25 al 75), en pesos. */
export default function VariedadChart({ variedad, height = 240 }: { variedad: Variedad; height?: number }) {
  const data = variedad.puntos.map((p) => ({
    periodo: p.periodo,
    indec: p.precio_indec,
    mediana: p.precio_mediana,
    banda: p.precio_p25 !== null && p.precio_p75 !== null ? [p.precio_p25, p.precio_p75] : null,
  }));
  if (data.filter((d) => d.indec !== null || d.mediana !== null).length < 2) {
    return <EmptyState message="Hace falta más de un mes para graficar." />;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px]" style={{ backgroundColor: COLOR_SUPER }} />
          Supermercados (mediana)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 opacity-30" style={{ backgroundColor: COLOR_SUPER }} />
          la mitad de los productos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 border-t-2 border-dashed" style={{ borderColor: COLOR_INDEC }} />
          INDEC GBA
        </span>
        <span className="text-zinc-600">pesos por {variedad.unidad}</span>
      </div>
      <div role="img" aria-label={`Precio de ${variedad.nombre}: supermercados e INDEC`}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="periodo"
              tickFormatter={fmtMes}
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) => fmtPesos(v)}
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
              formatter={(value, name) => {
                if (name === "banda" && Array.isArray(value)) {
                  return [`${fmtPesos(Number(value[0]))} a ${fmtPesos(Number(value[1]))}`, "Mitad de los productos"];
                }
                return [fmtPesos(Number(value)), name === "indec" ? "INDEC GBA" : "Supermercados"];
              }}
            />
            <Area
              type="monotone"
              dataKey="banda"
              stroke="none"
              fill={COLOR_SUPER}
              fillOpacity={0.15}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="mediana"
              stroke={COLOR_SUPER}
              strokeWidth={2}
              dot={{ r: 3, fill: COLOR_SUPER, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="indec"
              stroke={COLOR_INDEC}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: COLOR_INDEC, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
