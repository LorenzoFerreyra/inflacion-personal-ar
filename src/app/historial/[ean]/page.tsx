"use client";

import { useState, useEffect, useMemo, use } from "react";
import { Product, PriceHistoryData, ChainPrice } from "@/lib/types";
import PriceChart from "@/components/PriceChart";
import ProductImage from "@/components/ProductImage";
import { ArrowLeft, Download } from "@/components/Icons";
import { downloadCsv } from "@/lib/exportCsv";
import Link from "next/link";

interface PriceStats {
  min_historico: number;
  max_historico: number;
  min_chain: string | null;
  max_chain: string | null;
  min_fecha: string;
  max_fecha: string;
  dias_datos: number;
}

type TimeRange = "7d" | "30d" | "90d" | "all";
const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "all", label: "Todo" },
];

function filterByRange(
  data: PriceHistoryData,
  range: TimeRange,
): PriceHistoryData {
  if (range === "all") return data;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const filteredAvg = data.average.filter((p) => p.fecha >= cutoffStr);

  const filteredByChain: Record<string, { fecha: string; precio: number }[]> =
    {};
  for (const [chain, points] of Object.entries(data.byChain)) {
    filteredByChain[chain] = points.filter((p) => p.fecha >= cutoffStr);
  }

  return { average: filteredAvg, byChain: filteredByChain };
}

export default function HistorialProductPage({
  params,
}: {
  params: Promise<{ ean: string }>;
}) {
  const { ean } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData>({
    average: [],
    byChain: {},
  });
  const [chainPrices, setChainPrices] = useState<ChainPrice[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    Promise.all([
      fetch(`/api/product?ean=${ean}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/history?ean=${ean}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/chains?eans=${ean}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([prodData, histData, chainsData]) => {
        if (prodData) {
          setProduct(prodData.product);
          setStats(prodData.stats);
        }
        if (histData) setPriceHistory(histData);
        if (chainsData) setChainPrices(chainsData);
      })
      .catch((err) => {
        console.error("Failed to load product data:", err);
        setError(
          "No se pudieron cargar los datos del producto. Reintentá más tarde.",
        );
      })
      .finally(() => setLoading(false));
  }, [ean]);

  const filteredHistory = useMemo(
    () => filterByRange(priceHistory, timeRange),
    [priceHistory, timeRange],
  );

  const cheapestChain =
    chainPrices.length > 0
      ? chainPrices.reduce((min, c) =>
          c.total_canasta < min.total_canasta ? c : min,
        ).cadena
      : null;

  const priceBadge = useMemo(() => {
    if (!stats || !product?.precio_actual) return null;

    const current = product.precio_actual;
    const range = stats.max_historico - stats.min_historico;
    if (range === 0) return null;

    const position = (current - stats.min_historico) / range;

    if (position <= 0.15) {
      const chainNote = cheapestChain ? ` en ${cheapestChain}` : "";
      return {
        type: "low" as const,
        text: `Cerca del mínimo histórico${chainNote}`,
      };
    }
    if (position >= 0.85) {
      return {
        type: "high" as const,
        text: "Cerca del máximo histórico",
      };
    }
    return null;
  }, [stats, product?.precio_actual, cheapestChain]);

  const priceTable = useMemo(() => {
    const rows: {
      fecha: string;
      precio: number;
      cadenas: Record<string, number>;
    }[] = [];
    const dateMap = new Map<string, Record<string, number>>();

    for (const [chain, points] of Object.entries(priceHistory.byChain)) {
      for (const pt of points) {
        if (!dateMap.has(pt.fecha)) dateMap.set(pt.fecha, {});
        dateMap.get(pt.fecha)![chain] = pt.precio;
      }
    }

    for (const pt of priceHistory.average) {
      rows.push({
        fecha: pt.fecha,
        precio: pt.precio_promedio,
        cadenas: dateMap.get(pt.fecha) || {},
      });
    }

    return rows.reverse();
  }, [priceHistory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">Cargando producto...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <p className="text-red-400">{error}</p>
        <Link
          href="/historial"
          className="text-amber-400 text-sm mt-2 inline-block hover:underline"
        >
          Volver al historial
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-zinc-400">Producto no encontrado.</p>
        <Link
          href="/historial"
          className="text-amber-400 text-sm mt-2 inline-block hover:underline"
        >
          Volver al historial
        </Link>
      </div>
    );
  }

  const allChains = Object.keys(priceHistory.byChain);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/historial"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={14} />
        Volver al historial
      </Link>

      {/* Product header */}
      <div className="bg-linear-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/40 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-800/60 shrink-0">
            <ProductImage
              src={product.image_url}
              alt={product.product_description}
              marca={product.marca}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-semibold text-zinc-50">
              {product.product_description}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {product.marca} · {product.categoria}
            </p>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-3xl font-bold text-zinc-50 font-mono">
                ${product.precio_actual?.toLocaleString("es-AR")}
              </span>
              {product.variacion_pct !== null && (
                <span
                  className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${
                    product.variacion_pct > 0
                      ? "bg-red-500/10 text-red-400"
                      : product.variacion_pct < 0
                        ? "bg-green-500/10 text-green-400"
                        : "bg-zinc-800/50 text-zinc-400"
                  }`}
                >
                  {product.variacion_pct > 0 ? "+" : ""}
                  {product.variacion_pct}% (30d)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price badge */}
        {priceBadge && (
          <div
            className={`mt-4 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              priceBadge.type === "low"
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {priceBadge.text}
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <StatBox
              label="Mínimo histórico"
              value={`$${stats.min_historico.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`}
              sub={`${stats.min_chain ?? ""} · ${formatDate(stats.min_fecha)}`}
              color="green"
            />
            <StatBox
              label="Máximo histórico"
              value={`$${stats.max_historico.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`}
              sub={`${stats.max_chain ?? ""} · ${formatDate(stats.max_fecha)}`}
              color="red"
            />
            <StatBox
              label="Datos recopilados"
              value={`${stats.dias_datos} días`}
              sub={`${allChains.length} cadenas`}
              color="amber"
            />
          </div>
        )}
      </div>

      {/* Chart with time range controls */}
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
            Evolución de precios
          </h2>
          <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
            {TIME_RANGES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-3 py-1 rounded-md text-[12px] font-medium transition-all ${
                  timeRange === key
                    ? "bg-amber-500/15 text-amber-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <PriceChart
          data={filteredHistory}
          selectedChains={selectedChains}
          height={350}
        />

        {/* Chain toggles */}
        {allChains.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
              Filtrar por cadena
            </h4>
            <div className="flex flex-wrap gap-2">
              {allChains.map((chain) => {
                const isSelected = selectedChains.has(chain);
                return (
                  <button
                    key={chain}
                    onClick={() => {
                      setSelectedChains((prev) => {
                        const next = new Set(prev);
                        if (next.has(chain)) next.delete(chain);
                        else next.add(chain);
                        return next;
                      });
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                      isSelected
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "text-zinc-500 border-zinc-800/40 hover:text-zinc-300 hover:border-zinc-700/60"
                    }`}
                  >
                    {chain}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Chain prices grid */}
      {chainPrices.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">
            Precio actual por cadena
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {chainPrices.map((c) => {
              const isCheapest = c.cadena === cheapestChain;
              return (
                <div
                  key={c.cadena}
                  className={`rounded-xl p-3.5 text-center ${
                    isCheapest
                      ? "bg-green-500/8 border-2 border-green-500/30"
                      : "bg-zinc-900/50 border border-zinc-800/50"
                  }`}
                >
                  <p className="text-[11px] text-zinc-400 truncate font-medium uppercase tracking-wide">
                    {c.cadena}
                  </p>
                  <p
                    className={`text-xl font-bold mt-1.5 ${
                      isCheapest ? "text-green-400" : "text-zinc-200"
                    }`}
                  >
                    $
                    {c.total_canasta.toLocaleString("es-AR", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  {isCheapest && (
                    <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest">
                      Más barato
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price history table */}
      {priceTable.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Tabla de precios
            </h2>
            <button
              onClick={() => {
                const chains = allChains.slice(0, 6);
                downloadCsv(
                  `historial-${product.product_description.replace(/\s+/g, "-").toLowerCase()}.csv`,
                  ["Fecha", "Promedio", ...chains],
                  priceTable.map((row) => [
                    row.fecha,
                    String(row.precio),
                    ...chains.map((c) =>
                      row.cadenas[c] != null ? String(row.cadenas[c]) : "",
                    ),
                  ]),
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                         text-zinc-400 border border-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/60
                         transition-all"
            >
              <Download size={13} />
              Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-800/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Promedio
                  </th>
                  {allChains.slice(0, 6).map((chain) => (
                    <th
                      key={chain}
                      className="py-2.5 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider"
                    >
                      {chain}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceTable.slice(0, 30).map((row) => (
                  <tr
                    key={row.fecha}
                    className="border-b border-zinc-800/30 hover:bg-zinc-800/20"
                  >
                    <td className="py-2 px-3 text-zinc-400 text-[13px]">
                      {formatDate(row.fecha)}
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-200 font-mono text-[13px]">
                      $
                      {row.precio.toLocaleString("es-AR", {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    {allChains.slice(0, 6).map((chain) => (
                      <td
                        key={chain}
                        className="py-2 px-3 text-right text-zinc-400 font-mono text-[13px]"
                      >
                        {row.cadenas[chain]
                          ? `$${row.cadenas[chain].toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
                          : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {priceTable.length > 30 && (
            <p className="text-center text-[12px] text-zinc-500 mt-3">
              Mostrando últimas 30 fechas de {priceTable.length} disponibles.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "red" | "amber";
}) {
  const colorClasses = {
    green: "text-green-400",
    red: "text-red-400",
    amber: "text-amber-400",
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-lg p-3">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-lg font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
      <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
