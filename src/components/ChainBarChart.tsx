"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChainPrice } from "@/lib/types";

interface Props {
  data: ChainPrice[];
  height?: number;
}

const BAR_COLORS = [
  "#4ade80", // cheapest: green
  "#86efac",
  "#a1a1aa",
  "#a1a1aa",
  "#a1a1aa",
  "#f87171",
  "#ef4444", // most expensive: red
];

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
        margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
      >
        <XAxis
          type="number"
          tick={{ fill: "#52525b", fontSize: 10 }}
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
            borderRadius: "10px",
            fontSize: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
          formatter={(value) => [
            `$${Number(value).toLocaleString("es-AR")}`,
            "Precio promedio",
          ]}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="precio_promedio_canasta" radius={[0, 6, 6, 0]}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)]}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
