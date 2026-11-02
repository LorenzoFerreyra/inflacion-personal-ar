"use client";

import { useState, useEffect } from "react";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import ProductDetail from "@/components/ProductDetail";
import { Product, ChainPrice } from "@/lib/types";
import { PERIODS } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { Download } from "@/components/Icons";
import { downloadCsv } from "@/lib/exportCsv";
import VariationBadge from "@/components/VariationBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fmtPct } from "@/lib/format";

export default function InsightsPage() {
  const { period, ipc: ipcValues, ipcError } = usePeriod();
  const [products, setProducts] = useState<Product[]>([]);
  const [chains, setChains] = useState<ChainPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
        const { products: allProducts } = (await productsRes.json()) as {
          products: Product[];
          total: number;
        };
        if (cancelled) return;
        setProducts(allProducts);

        const eans = allProducts.slice(0, 50).map((p) => p.ean);
        if (eans.length > 0) {
          const chainsRes = await fetch(`/api/chains?eans=${eans.join(",")}`);
          if (!chainsRes.ok) throw new Error(`HTTP ${chainsRes.status}`);
          const chainsData = (await chainsRes.json()) as ChainPrice[];
          if (!cancelled) setChains(chainsData);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setChains([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
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
    return <LoadingSpinner message="Cargando insights..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-red-400">
          Error al cargar datos.
        </p>
        <button
          onClick={() => { setError(false); setLoading(true); }}
          className="text-xs text-zinc-400 hover:text-zinc-200 border border-hairline-strong rounded-sm px-4 py-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-zinc-50">Panorama general</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard
          label="Productos monitoreados"
          value={String(products.length)}
        />
        <KpiCard
          label="Mayor suba"
          value={maxUp ? fmtPct(maxUp.variacion_pct ?? 0) : "—"}
          subtitle={maxUp?.product_description}
          color="red"
        />
        <KpiCard
          label="Mayor baja"
          value={maxDown ? fmtPct(maxDown.variacion_pct ?? 0) : "—"}
          subtitle={maxDown?.product_description}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Alerts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-50">
              Alertas de precio
            </h3>
            <button
              onClick={() =>
                downloadCsv(
                  "alertas-precio.csv",
                  ["Producto", "Variación %"],
                  alerts.map((p) => [
                    p.product_description,
                    String(p.variacion_pct ?? ""),
                  ]),
                )
              }
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium
                         text-zinc-400 border border-hairline-strong hover:text-zinc-200 hover:bg-panel-2"
            >
              <Download size={11} />
              CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th className="py-2.5 px-3 w-8"></th>
                  <th className="py-2.5 px-3 text-left text-[11px] font-bold text-zinc-400 uppercase">
                    Producto
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-bold text-zinc-400 uppercase w-[22%]">
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
                        : "bg-zinc-600";
                  return (
                    <tr
                      key={p.ean}
                      onClick={() => setSelectedProduct(p)}
                      className="border-b border-hairline hover:bg-panel-2 cursor-pointer"
                    >
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${dotColor}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-zinc-200 truncate text-[13px]" title={p.product_description}>
                        {p.product_description}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <VariationBadge value={p.variacion_pct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* IPC comparison */}
        <div hidden={ipcError}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-50">
              vs. IPC ({fmtPct(ipcValue, false)})
            </h3>
            <button
              onClick={() =>
                downloadCsv(
                  "comparacion-ipc.csv",
                  ["Producto", "Variación %", `Delta vs IPC (${ipcValue}%)`],
                  ipcComparison.map((p) => [
                    p.product_description,
                    String(p.variacion_pct ?? ""),
                    String(p.delta_pp),
                  ]),
                )
              }
              className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-medium
                         text-zinc-400 border border-hairline-strong hover:text-zinc-200 hover:bg-panel-2"
            >
              <Download size={11} />
              CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th className="py-2.5 px-3 text-left text-[11px] font-bold text-zinc-400 uppercase w-[55%]">
                    Producto
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-bold text-zinc-400 uppercase w-[22%]">
                    Var %
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-bold text-zinc-400 uppercase w-[23%]">
                    &Delta; %
                  </th>
                </tr>
              </thead>
              <tbody>
                {ipcComparison.map((p) => (
                  <tr
                    key={p.ean}
                    onClick={() => setSelectedProduct(p)}
                    className="border-b border-hairline hover:bg-panel-2 cursor-pointer"
                  >
                    <td className="py-2 px-3 text-zinc-200 truncate text-[13px]" title={p.product_description}>
                      {p.product_description}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-500 text-[13px] tabular">
                      {p.variacion_pct !== null ? fmtPct(p.variacion_pct) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`tabular text-[13px] font-bold ${
                          p.delta_pp > 0 ? "text-red-400" : "text-green-400"
                        }`}
                      >
                        {fmtPct(p.delta_pp)}
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
          <h3 className="text-sm font-medium text-zinc-50 mb-3">
            Ranking de cadenas
          </h3>
          <div className="border-t border-hairline pt-4">
            <ChainBarChart data={chains} height={350} />
          </div>
        </div>
      </div>

      {/* Product detail drawer */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del producto"
          onClick={() => setSelectedProduct(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setSelectedProduct(null); }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-zinc-950 border-l border-hairline-strong overflow-y-auto p-6 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <ProductDetail
              key={selectedProduct.ean}
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
