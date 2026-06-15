"use client";

import { useState } from "react";
import ProductTable from "@/components/ProductTable";
import PriceChart from "@/components/PriceChart";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, PriceHistoryData, ChainPrice } from "@/lib/types";
import { useProducts } from "@/lib/useProducts";
import { Search } from "@/components/Icons";

export default function ExploradorPage() {
  const { search, setSearch, category, setCategory, page, setPage, products, totalCount, categories, loading } = useProducts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData>({ average: [], byChain: {} });
  const [chainPrices, setChainPrices] = useState<ChainPrice[]>([]);
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function selectProduct(product: Product) {
    setSelectedProduct(product);
    setLoadingDetail(true);

    try {
      const [historyRes, chainsRes] = await Promise.all([
        fetch(`/api/history?ean=${product.ean}`),
        fetch(`/api/chains?eans=${product.ean}`),
      ]);

      if (!historyRes.ok || !chainsRes.ok) throw new Error("Error al obtener detalle");

      setPriceHistory(await historyRes.json());
      setChainPrices(await chainsRes.json());
    } catch {
      setPriceHistory({ average: [], byChain: {} });
      setChainPrices([]);
    } finally {
      setLoadingDetail(false);
    }
  }

  const cheapestChain =
    chainPrices.length > 0
      ? chainPrices.reduce((min, c) =>
          c.total_canasta < min.total_canasta ? c : min,
        ).cadena
      : null;

  return (
    <div className="flex gap-6">
      {/* Left: product list */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Explorar productos
        </h2>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-lg pl-10 pr-4 py-2.5
                       text-sm text-zinc-200 placeholder-zinc-500
                       focus:outline-none focus:border-amber-500/40"
          />
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setCategory("")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${
              category === ""
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-zinc-900/40 text-zinc-400 border-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/60"
            }`}
          >
            Todas
          </button>
          {categories.slice(0, 12).map((cat) => (
            <button
              key={cat.categoria}
              onClick={() =>
                setCategory(category === cat.categoria ? "" : cat.categoria)
              }
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${
                category === cat.categoria
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-zinc-900/40 text-zinc-400 border-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/60"
              }`}
            >
              {cat.categoria}
            </button>
          ))}
        </div>

        <ProductTable
          products={products}
          page={page}
          totalCount={totalCount}
          onPageChange={setPage}
          onSelect={selectProduct}
          selectedEans={
            selectedProduct ? new Set([selectedProduct.ean]) : undefined
          }
          loading={loading}
        />
      </div>

      {/* Right: product detail */}
      <div className="w-96 flex-shrink-0">
        <div className="sticky top-24">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Detalle del producto
          </h2>

          {!selectedProduct ? (
            <div className="rounded-xl border-2 border-dashed border-zinc-800/60 p-10 text-center">
              <Search size={36} strokeWidth={1.2} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">
                Seleccion&aacute; un producto para ver su detalle.
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Cargando detalle...</span>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              {/* Info card */}
              <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-zinc-700/40 rounded-xl p-5">
                <h3 className="text-[15px] font-semibold text-zinc-100 leading-snug">
                  {selectedProduct.product_description}
                </h3>
                <p className="text-[13px] text-zinc-400 mt-1.5">
                  {selectedProduct.marca} &middot; {selectedProduct.categoria}
                </p>
                <div className="flex items-baseline gap-4 mt-3">
                  <span className="text-2xl font-bold text-zinc-50">
                    ${selectedProduct.precio_actual?.toLocaleString("es-AR")}
                  </span>
                  {selectedProduct.variacion_pct !== null && (
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded-md ${
                        selectedProduct.variacion_pct > 0
                          ? "bg-red-500/10 text-red-400"
                          : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {selectedProduct.variacion_pct > 0 ? "+" : ""}
                      {selectedProduct.variacion_pct}%
                    </span>
                  )}
                </div>
              </div>

              {/* Price history */}
              <div>
                <h4 className="text-[13px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Evoluci&oacute;n de precios
                </h4>
                <PriceChart data={priceHistory} selectedChains={selectedChains} />
              </div>

              {/* 2x2 chain grid */}
              {chainPrices.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                    Precio por cadena
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {chainPrices.map((c) => {
                      const isCheapest = c.cadena === cheapestChain;
                      const isSelected = selectedChains.has(c.cadena);
                      return (
                        <div
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
                                ? "bg-green-500/8 border-2 border-green-500/30"
                                : "bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/60"
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
                              M&aacute;s barato
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
