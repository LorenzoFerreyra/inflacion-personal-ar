"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PriceChart from "@/components/PriceChart";
import ProductImage from "@/components/ProductImage";
import {
  Product,
  PriceHistoryData,
  ChainPrice,
  IndecLinksData,
  IndecReferenceData,
} from "@/lib/types";
import { ArrowRight, X, ChevronRight } from "@/components/Icons";
import VariationBadge from "@/components/VariationBadge";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Props {
  product: Product;
  onClose?: () => void;
}

function isIndecProduct(ean: string): boolean {
  return ean.startsWith("INDEC-");
}

export default function ProductDetail({ product, onClose }: Props) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData>({
    average: [],
    byChain: {},
  });
  const [chainPrices, setChainPrices] = useState<ChainPrice[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [indecLinks, setIndecLinks] = useState<IndecLinksData | null>(null);
  const [indecRef, setIndecRef] = useState<IndecReferenceData | null>(null);
  const [brandExpanded, setBrandExpanded] = useState(false);

  const isIndec = isIndecProduct(product.ean);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSelectedChains(new Set());
        setLoading(true);
        setIndecLinks(null);
        setIndecRef(null);
        setBrandExpanded(false);
      }
    });

    async function load() {
      try {
        const fetches: Promise<Response>[] = [
          fetch(`/api/history?ean=${product.ean}`),
          fetch(`/api/chains?eans=${product.ean}`),
        ];

        if (isIndec) {
          fetches.push(fetch(`/api/indec-links?indec_ean=${product.ean}`));
        } else {
          fetches.push(fetch(`/api/indec-links?canon_ean=${product.ean}`));
        }

        const responses = await Promise.all(fetches);

        if (!responses[0].ok || !responses[1].ok)
          throw new Error("Error al obtener detalle");

        const [history, chains] = await Promise.all([
          responses[0].json(),
          responses[1].json(),
        ]);

        let indecData = null;
        if (responses[2].ok) {
          indecData = await responses[2].json();
        }

        if (!cancelled) {
          setPriceHistory(history);
          setChainPrices(chains);

          if (isIndec && indecData) {
            setIndecLinks(indecData as IndecLinksData);
          } else if (!isIndec && indecData?.indec_ean) {
            setIndecRef(indecData as IndecReferenceData);
          }
        }
      } catch {
        if (!cancelled) {
          setPriceHistory({ average: [], byChain: {} });
          setChainPrices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [product.ean, isIndec]);

  if (loading) {
    return <LoadingSpinner message="Cargando detalle..." />;
  }

  if (isIndec) {
    return (
      <IndecProductView
        product={product}
        priceHistory={priceHistory}
        indecLinks={indecLinks}
        onClose={onClose}
        brandExpanded={brandExpanded}
        setBrandExpanded={setBrandExpanded}
      />
    );
  }

  return (
    <RegularProductView
      product={product}
      priceHistory={priceHistory}
      chainPrices={chainPrices}
      selectedChains={selectedChains}
      setSelectedChains={setSelectedChains}
      indecRef={indecRef}
      onClose={onClose}
    />
  );
}

// ─── Vista A: Producto INDEC ─────────────────────────────────────────────────

function IndecProductView({
  product,
  priceHistory,
  indecLinks,
  onClose,
  brandExpanded,
  setBrandExpanded,
}: {
  product: Product;
  priceHistory: PriceHistoryData;
  indecLinks: IndecLinksData | null;
  onClose?: () => void;
  brandExpanded: boolean;
  setBrandExpanded: (v: boolean) => void;
}) {
  const lastAgg = indecLinks?.aggregates?.at(-1);
  const deltaPct =
    lastAgg && product.precio_actual
      ? ((lastAgg.mediana - product.precio_actual) / product.precio_actual) *
        100
      : null;

  const brandsToShow = brandExpanded
    ? indecLinks?.byBrand ?? []
    : (indecLinks?.byBrand ?? []).slice(0, 5);
  const hasMoreBrands = (indecLinks?.byBrand?.length ?? 0) > 5;

  return (
    <div className="space-y-4">
      {/* Info card */}
      <div className="bg-linear-to-br from-zinc-800/30 to-transparent border border-zinc-800/40 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ProductImage
            src={product.image_url}
            alt={product.product_description}
            marca={product.marca}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-zinc-100 leading-snug">
                {product.product_description}
              </h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-zinc-500 hover:text-zinc-300 shrink-0 mt-0.5"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="text-[13px] text-zinc-400 mt-1.5">
              {product.marca} &middot; {product.categoria}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-2xl font-bold text-zinc-50">
            ${product.precio_actual?.toLocaleString("es-AR")}
          </span>
          <VariationBadge value={product.variacion_pct} />
        </div>
        {indecLinks && indecLinks.linked_count > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 text-[12px] font-medium text-purple-300">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
              {indecLinks.linked_count} productos vinculados de supermercados
            </span>
          </div>
        )}
      </div>

      {/* Chart with INDEC line + supermarket band */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider">
            Evolución de precios
          </h4>
          <Link
            href={`/historial/${product.ean}`}
            className="flex items-center gap-1 text-[11px] text-amber-400/70 hover:text-amber-300 transition-colors"
          >
            Ver completo
            <ArrowRight size={10} />
          </Link>
        </div>
        <PriceChart
          data={priceHistory}
          selectedChains={new Set()}
          indecAggregates={indecLinks?.aggregates}
        />
      </div>

      {/* Aggregated stats */}
      {lastAgg && (
        <div>
          <h4 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Precios en supermercados (hoy)
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              label="Mediana"
              value={`$${Math.round(lastAgg.mediana).toLocaleString("es-AR")}`}
              color="text-amber-300"
            />
            <StatCard
              label="Mínimo"
              value={`$${Math.round(lastAgg.min).toLocaleString("es-AR")}`}
              color="text-green-400"
            />
            <StatCard
              label="Máximo"
              value={`$${Math.round(lastAgg.max).toLocaleString("es-AR")}`}
              color="text-red-400"
            />
            <StatCard
              label="Δ vs INDEC"
              value={
                deltaPct !== null
                  ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%`
                  : "—"
              }
              color={
                deltaPct !== null
                  ? deltaPct > 0
                    ? "text-red-400"
                    : "text-green-400"
                  : "text-zinc-500"
              }
            />
          </div>
        </div>
      )}

      {/* Brands list */}
      {brandsToShow.length > 0 && (
        <div>
          <h4 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Por marca
          </h4>
          <div className="space-y-1.5">
            {brandsToShow.map((b) => (
              <div
                key={b.marca}
                className="flex items-center justify-between rounded-lg bg-zinc-900/50 border border-zinc-800/50 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-200 truncate">
                    {b.marca}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {b.count} variante{b.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[13px] font-semibold text-zinc-300 tabular-nums">
                    ${Math.round(b.min_price).toLocaleString("es-AR")}
                    {b.min_price !== b.max_price &&
                      ` – $${Math.round(b.max_price).toLocaleString("es-AR")}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {hasMoreBrands && !brandExpanded && (
            <button
              onClick={() => setBrandExpanded(true)}
              className="mt-2 flex items-center gap-1 text-[12px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              Ver más marcas
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 p-2.5 text-center">
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-[15px] font-bold mt-0.5 tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Vista B: Producto regular (con posible referencia INDEC) ────────────────

function RegularProductView({
  product,
  priceHistory,
  chainPrices,
  selectedChains,
  setSelectedChains,
  indecRef,
  onClose,
}: {
  product: Product;
  priceHistory: PriceHistoryData;
  chainPrices: ChainPrice[];
  selectedChains: Set<string>;
  setSelectedChains: React.Dispatch<React.SetStateAction<Set<string>>>;
  indecRef: IndecReferenceData | null;
  onClose?: () => void;
}) {
  const cheapestChain =
    chainPrices.length > 1
      ? chainPrices.reduce((min, c) =>
          c.total_canasta < min.total_canasta ? c : min,
        ).cadena
      : null;

  const indecDeltaPct =
    indecRef?.indec_price && product.precio_actual
      ? ((product.precio_actual - indecRef.indec_price) /
          indecRef.indec_price) *
        100
      : null;

  return (
    <div className="space-y-4">
      {/* Info card */}
      <div className="bg-linear-to-br from-zinc-800/30 to-transparent border border-zinc-800/40 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ProductImage
            src={product.image_url}
            alt={product.product_description}
            marca={product.marca}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-zinc-100 leading-snug">
                {product.product_description}
              </h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-zinc-500 hover:text-zinc-300 shrink-0 mt-0.5"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <p className="text-[13px] text-zinc-400 mt-1.5">
              {product.marca} &middot; {product.categoria}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-4 mt-3">
          <span className="text-2xl font-bold text-zinc-50">
            ${product.precio_actual?.toLocaleString("es-AR")}
          </span>
          <VariationBadge value={product.variacion_pct} />
        </div>
      </div>

      {/* INDEC reference badge (Vista B) */}
      {indecRef?.indec_ean && indecRef.indec_price && (
        <div className="rounded-xl bg-purple-500/6 border border-purple-500/20 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-300/70 font-medium uppercase tracking-wide">
              Referencia INDEC
            </p>
            <p className="text-lg font-bold text-purple-300 mt-0.5 tabular-nums">
              ${indecRef.indec_price.toLocaleString("es-AR")}
            </p>
          </div>
          {indecDeltaPct !== null && (
            <div className="text-right">
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wide">
                Diferencia
              </p>
              <p
                className={`text-lg font-bold mt-0.5 tabular-nums ${
                  indecDeltaPct > 0 ? "text-red-400" : "text-green-400"
                }`}
              >
                {indecDeltaPct > 0 ? "+" : ""}
                {indecDeltaPct.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Price history */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider">
            Evolución de precios
          </h4>
          <Link
            href={`/historial/${product.ean}`}
            className="flex items-center gap-1 text-[11px] text-amber-400/70 hover:text-amber-300 transition-colors"
          >
            Ver completo
            <ArrowRight size={10} />
          </Link>
        </div>
        <PriceChart
          data={priceHistory}
          selectedChains={selectedChains}
          indecReferenceLine={indecRef?.indec_history}
        />
      </div>

      {/* Chain grid */}
      {chainPrices.length > 0 &&
        (() => {
          const selected = chainPrices.filter((c) =>
            selectedChains.has(c.cadena),
          );
          const selectedPricesArr = selected.map((c) => c.total_canasta);
          const priceDiff =
            selectedPricesArr.length >= 2
              ? Math.max(...selectedPricesArr) -
                Math.min(...selectedPricesArr)
              : null;
          const cheapestSelected =
            selected.length >= 2
              ? selected.reduce((min, c) =>
                  c.total_canasta < min.total_canasta ? c : min,
                ).cadena
              : null;

          return (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Precio por cadena
                </h4>
                {selectedChains.size > 0 && (
                  <button
                    onClick={() => setSelectedChains(new Set())}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300"
                  >
                    Limpiar ({selectedChains.size})
                  </button>
                )}
              </div>

              {selectedChains.size === 0 && (
                <p className="text-[11px] text-zinc-500 mb-2">
                  Seleccioná cadenas para compararlas en el gráfico
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                {chainPrices.map((c) => {
                  const isCheapest = c.cadena === cheapestChain;
                  const isSelected = selectedChains.has(c.cadena);
                  return (
                    <button
                      key={c.cadena}
                      onClick={() => {
                        setSelectedChains((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.cadena)) {
                            next.delete(c.cadena);
                          } else {
                            next.add(c.cadena);
                          }
                          return next;
                        });
                      }}
                      className={`rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-amber-500/60 bg-amber-500/8 border border-amber-500/30"
                          : isCheapest
                            ? "bg-green-500/8 border border-green-500/30"
                            : "bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/60"
                      }`}
                    >
                      <p className="text-[11px] text-zinc-400 truncate font-medium uppercase tracking-wide">
                        {c.cadena}
                      </p>
                      <p
                        className={`text-xl font-bold mt-1.5 tabular-nums ${
                          isCheapest ? "text-green-400" : "text-zinc-200"
                        }`}
                      >
                        $
                        {c.total_canasta.toLocaleString("es-AR", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      {isCheapest && !isSelected && (
                        <span className="text-[10px] text-green-400/80 font-bold uppercase tracking-widest">
                          Más barato
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] text-amber-400/80 font-medium uppercase tracking-wide">
                          Comparando
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Comparison summary */}
              {priceDiff !== null && selected.length >= 2 && (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                        Diferencia entre seleccionadas
                      </p>
                      <p className="text-lg font-bold text-amber-300 mt-0.5 tabular-nums">
                        $
                        {priceDiff.toLocaleString("es-AR", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    {cheapestSelected && (
                      <div className="text-right">
                        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                          Más barata
                        </p>
                        <p className="text-sm font-semibold text-green-400 mt-0.5">
                          {cheapestSelected}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}
