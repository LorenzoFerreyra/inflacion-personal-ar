"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { PricePoint } from "@/lib/types";

interface Props {
  data: PricePoint[];
  height?: number;
}

export default function PriceChart({ data, height = 220 }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm rounded-xl border border-zinc-800/40 bg-zinc-900/30">
        No hay suficientes datos para graficar.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-3">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9a64e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#d9a64e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="fecha"
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#27272a40" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: number) => `$${val.toLocaleString("es-AR")}`}
            width={65}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "10px",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "#71717a", fontSize: "11px" }}
            formatter={(value) => [
              `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
              "Precio",
            ]}
          />
          <Area
            type="monotone"
            dataKey="precio_promedio"
            stroke="#d9a64e"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#d9a64e",
              stroke: "#18181b",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
