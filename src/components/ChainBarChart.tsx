/**
 * ChainBarChart.tsx — Gráfico de barras horizontales: precio promedio por cadena.
 *
 * Muestra un ranking de supermercados de más barato a más caro.
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChainPrice } from "@/lib/types";

interface Props {
  data: ChainPrice[];
  height?: number;
}

export default function ChainBarChart({ data, height = 250 }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
        Sin datos de cadenas.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <XAxis
          type="number"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val: number) => `$${val.toLocaleString("es-AR")}`}
        />
        <YAxis
          type="category"
          dataKey="cadena"
          tick={{ fill: "#a1a1aa", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={100}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [
            `$${value.toLocaleString("es-AR")}`,
            "Precio promedio",
          ]}
        />
        <Bar
          dataKey="precio_promedio_canasta"
          fill="#4ade80"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
