"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PriceChart from "@/components/PriceChart";
import ProductImage from "@/components/ProductImage";
import { Product, PriceHistoryData, ChainPrice } from "@/lib/types";
import { ArrowRight, X } from "@/components/Icons";
import VariationBadge from "@/components/VariationBadge";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Props {
  product: Product;
  onClose?: () => void;
}

export default function ProductDetail({ product, onClose }: Props) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData>({
    average: [],
    byChain: {},
  });
  const [chainPrices, setChainPrices] = useState<ChainPrice[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSelectedChains(new Set());
        setLoading(true);
      }
    });

    async function load() {
      try {
        const [historyRes, chainsRes] = await Promise.all([
          fetch(`/api/history?ean=${product.ean}`),
          fetch(`/api/chains?eans=${product.ean}`),
        ]);

        if (!historyRes.ok || !chainsRes.ok)
          throw new Error("Error al obtener detalle");

        const [history, chains] = await Promise.all([
          historyRes.json(),
          chainsRes.json(),
        ]);

        if (!cancelled) {
          setPriceHistory(history);
          setChainPrices(chains);
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
  }, [product.ean]);

  const cheapestChain =
    chainPrices.length > 0
      ? chainPrices.reduce((min, c) =>
          c.total_canasta < min.total_canasta ? c : min,
        ).cadena
      : null;

  if (loading) {
    return <LoadingSpinner message="Cargando detalle..." />;
  }

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
        <PriceChart data={priceHistory} selectedChains={selectedChains} />
      </div>

      {/* Chain grid */}
      {chainPrices.length > 0 && (() => {
        const selected = chainPrices.filter((c) => selectedChains.has(c.cadena));
        const selectedPrices = selected.map((c) => c.total_canasta);
        const priceDiff = selectedPrices.length >= 2
          ? Math.max(...selectedPrices) - Math.min(...selectedPrices)
          : null;
        const cheapestSelected = selected.length >= 2
          ? selected.reduce((min, c) => c.total_canasta < min.total_canasta ? c : min).cadena
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
                      ${priceDiff.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
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
