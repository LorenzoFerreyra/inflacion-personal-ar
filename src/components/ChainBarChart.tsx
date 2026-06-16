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
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e4e4e7",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
          labelStyle={{ color: "#a1a1aa", marginBottom: 2 }}
          itemStyle={{ color: "#e4e4e7" }}
          formatter={(value) => [
            `$${Number(value).toLocaleString("es-AR")}`,
            "Total canasta",
          ]}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="total_canasta" radius={[0, 6, 6, 0]}>
          {data.map((item, index) => (
            <Cell
              key={item.cadena}
              fill={BAR_COLORS[Math.min(index, BAR_COLORS.length - 1)]}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
