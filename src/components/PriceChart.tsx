"use client";

import { useMemo } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Line,
} from "recharts";
import { PriceHistoryData, IndecAggregate, PricePoint } from "@/lib/types";
import { chainColor } from "@/lib/chainColors";
import EmptyState from "@/components/EmptyState";

interface Props {
  data: PriceHistoryData;
  selectedChains: Set<string>;
  height?: number;
  indecAggregates?: IndecAggregate[];
  indecReferenceLine?: PricePoint[];
}

export default function PriceChart({
  data,
  selectedChains,
  height = 220,
  indecAggregates,
  indecReferenceLine,
}: Props) {
  const chains = useMemo(() => Object.keys(data.byChain), [data.byChain]);
  const visibleChains = useMemo(
    () => chains.filter((c) => selectedChains.has(c)),
    [chains, selectedChains],
  );

  const mergedData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();

    for (const pt of data.average) {
      dateMap.set(pt.fecha, { precio_promedio: pt.precio_promedio });
    }

    for (const cadena of visibleChains) {
      const points = data.byChain[cadena];
      if (!points) continue;
      for (const pt of points) {
        const existing = dateMap.get(pt.fecha) || {};
        existing[cadena] = pt.precio;
        dateMap.set(pt.fecha, existing);
      }
    }

    if (indecAggregates) {
      for (const pt of indecAggregates) {
        const existing = dateMap.get(pt.fecha) || {};
        existing.indec_mediana = pt.mediana;
        existing.indec_min = pt.min;
        existing.indec_max = pt.max;
        dateMap.set(pt.fecha, existing);
      }
    }

    if (indecReferenceLine) {
      for (const pt of indecReferenceLine) {
        const existing = dateMap.get(pt.fecha) || {};
        existing.indec_ref = pt.precio_promedio;
        dateMap.set(pt.fecha, existing);
      }
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, values]) => ({ fecha, ...values }));
  }, [data, visibleChains, indecAggregates, indecReferenceLine]);

  if (data.average.length < 2) {
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30">
        <EmptyState message="No hay suficientes datos para graficar." />
      </div>
    );
  }

  const hasIndecAgg = indecAggregates && indecAggregates.length > 0;
  const hasIndecRef = indecReferenceLine && indecReferenceLine.length > 0;

  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 px-1">
        {visibleChains.map((chain) => (
          <span
            key={chain}
            className="flex items-center gap-1 text-[10px] text-zinc-400"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: chainColor(chain) }}
            />
            {chain}
          </span>
        ))}
        {(visibleChains.length > 0 || hasIndecAgg || hasIndecRef) && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: "#d9a64e" }}
            />
            {hasIndecAgg ? "INDEC" : "promedio"}
          </span>
        )}
        {hasIndecAgg && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <span
              className="inline-block w-2 h-2 rounded-full border border-dashed"
              style={{ borderColor: "#f59e0b", backgroundColor: "transparent" }}
            />
            mediana supermercados
          </span>
        )}
        {hasIndecRef && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: "#a855f7" }}
            />
            INDEC
          </span>
        )}
      </div>
      <div role="img" aria-label="Gráfico de evolución de precios">
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
            <linearGradient id="indecBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
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
            formatter={(value, name) => {
              const v = `$${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
              const labels: Record<string, string> = {
                precio_promedio: hasIndecAgg ? "INDEC" : "Promedio",
                indec_mediana: "Mediana supermercados",
                indec_min: "Mín supermercados",
                indec_max: "Máx supermercados",
                indec_ref: "INDEC",
              };
              return [v, labels[String(name)] ?? String(name)];
            }}
          />

          {hasIndecAgg && (
            <Area
              type="monotone"
              dataKey="indec_max"
              stroke="none"
              fill="url(#indecBandGradient)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          {hasIndecAgg && (
            <Area
              type="monotone"
              dataKey="indec_min"
              stroke="none"
              fill="#18181b"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}

          <Area
            type="monotone"
            dataKey="precio_promedio"
            stroke={hasIndecAgg ? "#a855f7" : "#d9a64e"}
            strokeWidth={2}
            fill={hasIndecAgg ? "none" : "url(#priceGradient)"}
            dot={false}
            activeDot={{
              r: 4,
              fill: hasIndecAgg ? "#a855f7" : "#d9a64e",
              stroke: "#18181b",
              strokeWidth: 2,
            }}
          />

          {hasIndecAgg && (
            <Line
              type="monotone"
              dataKey="indec_mediana"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              activeDot={{
                r: 3,
                fill: "#f59e0b",
                stroke: "#18181b",
                strokeWidth: 2,
              }}
            />
          )}

          {hasIndecRef && (
            <Line
              type="monotone"
              dataKey="indec_ref"
              stroke="#a855f7"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
              activeDot={{
                r: 3,
                fill: "#a855f7",
                stroke: "#18181b",
                strokeWidth: 2,
              }}
            />
          )}

          {visibleChains.map((chain) => (
            <Line
              key={chain}
              type="monotone"
              dataKey={chain}
              stroke={chainColor(chain)}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              activeDot={{
                r: 3,
                fill: chainColor(chain),
                stroke: "#18181b",
                strokeWidth: 2,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
