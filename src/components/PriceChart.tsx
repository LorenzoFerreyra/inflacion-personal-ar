"use client";

import { useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
} from "recharts";
import { PriceHistoryData } from "@/lib/types";

const CHAIN_COLORS = [
  "#6ee7b7",
  "#7dd3fc",
  "#c4b5fd",
  "#fca5a5",
  "#fcd34d",
  "#f0abfc",
  "#a5f3fc",
  "#fda4af",
];

interface Props {
  data: PriceHistoryData;
  height?: number;
}

export default function PriceChart({ data, height = 220 }: Props) {
  const chains = useMemo(() => Object.keys(data.byChain), [data.byChain]);
  const [showChains, setShowChains] = useState(true);

  const mergedData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    for (const pt of data.average) {
      dateMap.set(pt.fecha, { precio_promedio: pt.precio_promedio });
    }

    for (const [cadena, points] of Object.entries(data.byChain)) {
      for (const pt of points) {
        const existing = dateMap.get(pt.fecha) || {};
        existing[cadena] = pt.precio;
        dateMap.set(pt.fecha, existing);
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, values]) => ({ fecha, ...values }));
  }, [data]);

  if (data.average.length < 2) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500 text-sm rounded-xl border border-zinc-800/40 bg-zinc-900/30">
        No hay suficientes datos para graficar.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-3">
      {chains.length > 0 && (
        <div className="flex items-center gap-3 mb-2 px-1">
          <button
            onClick={() => setShowChains(!showChains)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
              showChains
                ? "bg-zinc-700/60 text-zinc-200"
                : "bg-zinc-800/40 text-zinc-500 hover:text-zinc-400"
            }`}
          >
            {showChains ? "Ocultar cadenas" : "Ver por cadena"}
          </button>
          {showChains && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {chains.map((chain, i) => (
                <span
                  key={chain}
                  className="flex items-center gap-1 text-[10px] text-zinc-400"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CHAIN_COLORS[i % CHAIN_COLORS.length],
                    }}
                  />
                  {chain}
                </span>
              ))}
              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#d9a64e" }}
                />
                promedio
              </span>
            </div>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={mergedData}
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
            formatter={(value, name) => [
              `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
              name === "precio_promedio" ? "Promedio" : String(name),
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
          {showChains &&
            chains.map((chain, i) => (
              <Line
                key={chain}
                type="monotone"
                dataKey={chain}
                stroke={CHAIN_COLORS[i % CHAIN_COLORS.length]}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={{
                  r: 3,
                  fill: CHAIN_COLORS[i % CHAIN_COLORS.length],
                  stroke: "#18181b",
                  strokeWidth: 2,
                }}
              />
            ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
