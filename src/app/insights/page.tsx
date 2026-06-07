/**
 * insights/page.tsx — "Insights"
 *
 * Vista panorámica del estado de precios:
 *   - KPIs: total de productos, mayor suba, mayor baja
 *   - Tabla de alertas: productos con mayor inflación
 *   - Ranking de cadenas por precio promedio
 */

"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, ChainPrice } from "@/lib/types";
import { PERIODS, PeriodKey } from "@/lib/constants";

export default function InsightsPage() {
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [products, setProducts] = useState<Product[]>([]);
  const [chains, setChains] = useState<ChainPrice[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Cargar datos ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);

      // Traer una muestra amplia de productos para calcular insights
      const params = new URLSearchParams({
        dias: String(PERIODS[period].dias),
        pageSize: "200",
      });
      const productsRes = await fetch(`/api/products?${params}`);
      const allProducts: Product[] = await productsRes.json();
      setProducts(allProducts);

      // Traer ranking de cadenas usando los primeros 50 EANs
      const eans = allProducts.slice(0, 50).map((p) => p.ean);
      if (eans.length > 0) {
        const chainsRes = await fetch(`/api/chains?eans=${eans.join(",")}`);
        const chainsData: ChainPrice[] = await chainsRes.json();
        setChains(chainsData);
      }

      setLoading(false);
    }
    load();
  }, [period]);

  // ─── Calcular insights ───────────────────────────────────────────────

  const validProducts = products.filter((p) => p.variacion_pct !== null);

  const maxUp = validProducts.length > 0
    ? validProducts.reduce((max, p) =>
        (p.variacion_pct ?? 0) > (max.variacion_pct ?? 0) ? p : max
      )
    : null;

  const maxDown = validProducts.length > 0
    ? validProducts.reduce((min, p) =>
        (p.variacion_pct ?? 0) < (min.variacion_pct ?? 0) ? p : min
      )
    : null;

  // Top 15 productos con mayor suba
  const alerts = [...validProducts]
    .sort((a, b) => (b.variacion_pct ?? 0) - (a.variacion_pct ?? 0))
    .slice(0, 15);

  // ─── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-500">
        Cargando insights...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">
          Panorama general
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2
                     text-sm text-zinc-300
                     focus:outline-none focus:border-zinc-500"
        >
          {Object.entries(PERIODS).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

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

      {/* Contenido inferior: alertas + ranking cadenas */}
      <div className="grid grid-cols-2 gap-6">
        {/* Alertas de precio */}
        <div>
          <h3 className="text-base font-medium text-zinc-200 mb-3">
            Alertas de precio
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="py-2.5 px-3 font-medium">Producto</th>
                  <th className="py-2.5 px-3 font-medium">Marca</th>
                  <th className="py-2.5 px-3 font-medium text-right">Var %</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((p) => (
                  <tr
                    key={p.ean}
                    className="border-b border-zinc-800/50"
                  >
                    <td className="py-2 px-3 text-zinc-200 truncate max-w-48">
                      {p.product_description}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">
                      {p.marca}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`font-medium ${
                          (p.variacion_pct ?? 0) > 20
                            ? "text-red-400"
                            : (p.variacion_pct ?? 0) > 10
                            ? "text-amber-400"
                            : "text-green-400"
                        }`}
                      >
                        +{p.variacion_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking de cadenas */}
        <div>
          <h3 className="text-base font-medium text-zinc-200 mb-3">
            Ranking de cadenas
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <ChainBarChart data={chains} height={300} />
          </div>
        </div>
      </div>
    </div>
  );
}
