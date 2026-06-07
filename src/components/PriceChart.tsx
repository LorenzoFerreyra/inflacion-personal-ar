/**
 * PriceChart.tsx — Gráfico de línea con la evolución histórica de precios.
 *
 * Usa Recharts (wrapper de D3 para React).
 * El eje X muestra fechas, el eje Y el precio promedio.
 */

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PricePoint } from "@/lib/types";

interface Props {
  data: PricePoint[];
  height?: number;
}

export default function PriceChart({ data, height = 220 }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
        No hay suficientes datos para graficar.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <XAxis
          dataKey="fecha"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#27272a" }}
          // Mostrar solo algunas fechas para que no se amontonen
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val: number) => `$${val.toLocaleString("es-AR")}`}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          labelStyle={{ color: "#a1a1aa" }}
          formatter={(value: number) => [
            `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
            "Precio",
          ]}
        />
        <Line
          type="monotone"
          dataKey="precio_promedio"
          stroke="#c9a87c"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#c9a87c" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
