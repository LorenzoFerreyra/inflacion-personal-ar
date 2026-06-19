"use client";

import { useState, useMemo } from "react";
import ProductTable from "@/components/ProductTable";
import ProductDetail from "@/components/ProductDetail";
import { Product } from "@/lib/types";
import { useProducts } from "@/lib/useProducts";
import { Search } from "@/components/Icons";
import { chainLabel } from "@/lib/chainColors";

export default function ExploradorPage() {
  const {
    search,
    setSearch,
    category,
    setCategory,
    cadena,
    setCadena,
    page,
    setPage,
    products,
    totalCount,
    categories,
    chains,
    loading,
    categoriesError,
    chainsError,
  } = useProducts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const selectedEans = useMemo(
    () => (selectedProduct ? new Set([selectedProduct.ean]) : undefined),
    [selectedProduct],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: product list */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Explorar productos
        </h2>

        {/* Search bar + chain filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
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
          <select
            value={cadena}
            onChange={(e) => setCadena(e.target.value)}
            className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-3 py-2.5
                       text-sm text-zinc-300 focus:outline-none focus:border-amber-500/40"
          >
            <option value="">
              {chainsError
                ? "Error al cargar cadenas"
                : "Todos los supermercados"}
            </option>
            {chains.map((ch) => (
              <option key={ch} value={ch}>
                {chainLabel(ch)}
              </option>
            ))}
          </select>
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
          {categoriesError ? (
            <span className="text-[12px] text-red-400/80 self-center">
              Error al cargar categorías
            </span>
          ) : (
            categories.slice(0, 12).map((cat) => (
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
            ))
          )}
        </div>

        <ProductTable
          products={products}
          page={page}
          totalCount={totalCount}
          onPageChange={setPage}
          onSelect={setSelectedProduct}
          selectedEans={selectedEans}
          loading={loading}
        />
      </div>

      {/* Right: product detail */}
      <div className="w-full lg:w-96 shrink-0">
        <div className="sticky top-24">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Detalle del producto
          </h2>

          {!selectedProduct ? (
            <div className="rounded-xl border-2 border-dashed border-zinc-800/60 p-10 text-center">
              <Search
                size={36}
                strokeWidth={1.2}
                className="mx-auto text-zinc-700 mb-3"
              />
              <p className="text-sm text-zinc-500">
                Seleccioná un producto para ver su detalle.
              </p>
            </div>
          ) : (
            <ProductDetail
              key={selectedProduct.ean}
              product={selectedProduct}
            />
          )}
        </div>
      </div>
    </div>
  );
}
