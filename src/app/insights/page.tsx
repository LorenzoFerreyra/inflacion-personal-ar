"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, ChainPrice } from "@/lib/types";
import { IPC, PERIODS } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";

export default function InsightsPage() {
  const { period } = usePeriod();
  const [products, setProducts] = useState<Product[]>([]);
  const [chains, setChains] = useState<ChainPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const params = new URLSearchParams({
        dias: String(PERIODS[period].dias),
        pageSize: "200",
      });
      const productsRes = await fetch(`/api/products?${params}`);
      const allProducts: Product[] = await productsRes.json();
      setProducts(allProducts);

      const eans = allProducts.slice(0, 50).map((p) => p.ean);
      if (eans.length > 0) {
        const chainsRes = await fetch(`/api/chains?eans=${eans.join(",")}`);
        setChains(await chainsRes.json());
      }

      setLoading(false);
    }
    load();
  }, [period]);

  // ─── Compute insights ───────────────────────────────────────────────

  const ipcValue = IPC[period];
  const validProducts = products.filter((p) => p.variacion_pct !== null);

  const maxUp =
    validProducts.length > 0
      ? validProducts.reduce((max, p) =>
          (p.variacion_pct ?? 0) > (max.variacion_pct ?? 0) ? p : max
        )
      : null;

  const maxDown =
    validProducts.length > 0
      ? validProducts.reduce((min, p) =>
          (p.variacion_pct ?? 0) < (min.variacion_pct ?? 0) ? p : min
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
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Cargando insights...
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          color="red"
        />
        <KpiCard
          label="Mayor baja"
          value={maxDown ? `${maxDown.variacion_pct}%` : "—"}
          subtitle={maxDown?.product_description}
          color="green"
        />
      </div>

      {/* Three columns: alerts, IPC comparison, chain ranking */}
      <div className="grid grid-cols-3 gap-6">
        {/* Alerts with severity dots */}
        <div>
          <h3 className="text-base font-medium text-zinc-200 mb-3">
            Alertas de precio
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="py-2.5 px-3 font-medium w-6"></th>
                  <th className="py-2.5 px-3 font-medium">Producto</th>
                  <th className="py-2.5 px-3 font-medium text-right">Var %</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((p) => {
                  const v = p.variacion_pct ?? 0;
                  const dotColor =
                    v > 20
                      ? "bg-red-500"
                      : v > 10
                      ? "bg-amber-500"
                      : "bg-green-500";
                  return (
                    <tr key={p.ean} className="border-b border-zinc-800/50">
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-zinc-200 truncate max-w-36">
                        {p.product_description}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`font-medium ${
                            v > 20
                              ? "text-red-400"
                              : v > 10
                              ? "text-amber-400"
                              : "text-green-400"
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
          <h3 className="text-base font-medium text-zinc-200 mb-3">
            vs. IPC ({ipcValue}%)
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="py-2.5 px-3 font-medium">Producto</th>
                  <th className="py-2.5 px-3 font-medium text-right">Var %</th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    &Delta; pp
                  </th>
                </tr>
              </thead>
              <tbody>
                {ipcComparison.map((p) => (
                  <tr key={p.ean} className="border-b border-zinc-800/50">
                    <td className="py-2 px-3 text-zinc-200 truncate max-w-36">
                      {p.product_description}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-400">
                      {p.variacion_pct !== null
                        ? `${p.variacion_pct > 0 ? "+" : ""}${p.variacion_pct}%`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`font-medium ${
                          p.delta_pp > 0 ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {p.delta_pp > 0 ? "+" : ""}
                        {p.delta_pp} pp
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
          <h3 className="text-base font-medium text-zinc-200 mb-3">
            Ranking de cadenas
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <ChainBarChart data={chains} height={350} />
          </div>
        </div>
      </div>
    </div>
  );
}
