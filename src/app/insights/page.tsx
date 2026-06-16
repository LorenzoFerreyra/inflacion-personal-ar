"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, ChainPrice } from "@/lib/types";
import { PERIODS } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";

export default function InsightsPage() {
  const { period, ipc: ipcValues } = usePeriod();
  const [products, setProducts] = useState<Product[]>([]);
  const [chains, setChains] = useState<ChainPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          dias: String(PERIODS[period].dias),
          pageSize: "200",
        });
        const productsRes = await fetch(`/api/products?${params}`);
        if (!productsRes.ok) throw new Error(`HTTP ${productsRes.status}`);
        const { products: allProducts } = await productsRes.json() as { products: Product[]; total: number };
        if (cancelled) return;
        setProducts(allProducts);

        const eans = allProducts.slice(0, 50).map((p) => p.ean);
        if (eans.length > 0) {
          const chainsRes = await fetch(`/api/chains?eans=${eans.join(",")}`);
          if (!chainsRes.ok) throw new Error(`HTTP ${chainsRes.status}`);
          const chainsData = await chainsRes.json() as ChainPrice[];
          if (!cancelled) setChains(chainsData);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setChains([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [period]);

  const ipcValue = ipcValues[period];
  const validProducts = products.filter((p) => p.variacion_pct !== null);

  const maxUp =
    validProducts.length > 0
      ? validProducts.reduce((max, p) =>
          (p.variacion_pct ?? 0) > (max.variacion_pct ?? 0) ? p : max,
        )
      : null;

  const maxDown =
    validProducts.length > 0
      ? validProducts.reduce((min, p) =>
          (p.variacion_pct ?? 0) < (min.variacion_pct ?? 0) ? p : min,
        )
      : null;

  const alerts = [...validProducts]
    .sort((a, b) => (b.variacion_pct ?? 0) - (a.variacion_pct ?? 0))
    .slice(0, 15);

  const ipcComparison = [...validProducts]
    .map((p) => ({
      ...p,
      delta_pp: Math.round(((p.variacion_pct ?? 0) - ipcValue) * 10) / 10,
    }))
    .sort((a, b) => b.delta_pp - a.delta_pp)
    .slice(0, 15);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Cargando insights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-zinc-100">Panorama general</h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Productos monitoreados"
          value={String(products.length)}
        />
        <KpiCard
          label="Mayor suba"
          value={maxUp ? `+${maxUp.variacion_pct}%` : "—"}
          subtitle={maxUp?.product_description}
          color="green"
        />
        <KpiCard
          label="Mayor baja"
          value={maxDown ? `${maxDown.variacion_pct}%` : "—"}
          subtitle={maxDown?.product_description}
          color="red"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Alerts */}
        <div>
          <h3 className="text-[15px] font-semibold text-zinc-200 mb-3 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-red-400/70 flex-shrink-0" />
            Alertas de precio
          </h3>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th className="py-2.5 px-3 w-6"></th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Var %
                  </th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((p) => {
                  const v = p.variacion_pct ?? 0;
                  const dotColor =
                    v > 20
                      ? "bg-red-500 pulse-dot"
                      : v > 10
                        ? "bg-amber-500"
                        : "bg-green-500";
                  return (
                    <tr
                      key={p.ean}
                      className="border-b border-zinc-800/30 hover:bg-zinc-800/20"
                    >
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${dotColor}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-zinc-200 truncate max-w-36 text-[13px]">
                        {p.product_description}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[12px] font-semibold ${
                            v > 20
                              ? "bg-red-500/10 text-red-400"
                              : v > 10
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-green-500/10 text-green-400"
                          }`}
                        >
                          +{p.variacion_pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* IPC comparison */}
        <div>
          <h3 className="text-[15px] font-semibold text-zinc-200 mb-3 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-amber-400/60 flex-shrink-0" />
            vs. IPC ({ipcValue}%)
          </h3>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Var %
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    &Delta; %
                  </th>
                </tr>
              </thead>
              <tbody>
                {ipcComparison.map((p) => (
                  <tr
                    key={p.ean}
                    className="border-b border-zinc-800/30 hover:bg-zinc-800/20"
                  >
                    <td className="py-2 px-3 text-zinc-200 truncate max-w-36 text-[13px]">
                      {p.product_description}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-500 text-[13px] tabular-nums">
                      {p.variacion_pct !== null
                        ? `${p.variacion_pct > 0 ? "+" : ""}${p.variacion_pct}%`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[12px] font-semibold tabular-nums ${
                          p.delta_pp > 0
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {p.delta_pp > 0 ? "+" : ""}
                        {p.delta_pp}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chain ranking */}
        <div>
          <h3 className="text-[15px] font-semibold text-zinc-200 mb-3 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-zinc-500/80 flex-shrink-0" />
            Ranking de cadenas
          </h3>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <ChainBarChart data={chains} height={350} />
          </div>
        </div>
      </div>
    </div>
  );
}
