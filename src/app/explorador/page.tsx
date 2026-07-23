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
    <div className="flex flex-col lg:flex-row gap-10">
      {/* Left: product list */}
      <div className="flex-1 min-w-0">
        <header className="mb-6">
          <h1 className="font-display text-[26px] font-semibold text-zinc-50">
            Explorador de precios
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Todo el relevamiento, producto por producto.
          </p>
        </header>

        {/* Search bar + chain filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
              className="w-full bg-panel border border-hairline rounded-sm pl-10 pr-4 py-2.5
                         text-sm text-zinc-200 focus:outline-none"
            />
          </div>
          <select
            value={cadena}
            onChange={(e) => setCadena(e.target.value)}
            className="bg-panel border border-hairline rounded-sm px-3 py-2.5
                       text-sm text-zinc-300 focus:outline-none"
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

        {/* Category filters: editorial underline tags */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-5 border-b border-hairline pb-2">
          <button
            onClick={() => setCategory("")}
            className={`text-[12px] py-1 border-b-2 -mb-[9px] ${
              category === ""
                ? "text-amber-300 border-amber-450 font-medium"
                : "text-zinc-400 border-transparent hover:text-zinc-200"
            }`}
          >
            todas
          </button>
          {categoriesError ? (
            <span className="text-[12px] text-red-400 self-center">
              Error al cargar categorías
            </span>
          ) : (
            categories.slice(0, 12).map((cat) => (
              <button
                key={cat.categoria}
                onClick={() =>
                  setCategory(category === cat.categoria ? "" : cat.categoria)
                }
                className={`text-[12px] py-1 border-b-2 -mb-[9px] ${
                  category === cat.categoria
                    ? "text-amber-300 border-amber-450 font-medium"
                    : "text-zinc-400 border-transparent hover:text-zinc-200"
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
          chainFiltered={cadena.trim().length > 0}
        />
      </div>

      {/* Right: product detail */}
      <div className="w-full lg:w-96 shrink-0">
        <div className="sticky top-28">
          <h2 className="text-[11px] font-bold uppercase text-zinc-400 border-b border-hairline pb-2 mb-5">
            Detalle del producto
          </h2>

          {!selectedProduct ? (
            <div className="pt-8 text-center">
              <Search
                size={26}
                strokeWidth={1.2}
                className="mx-auto text-zinc-700 mb-3"
              />
              <p className="text-sm text-zinc-500 max-w-55 mx-auto">
                Seleccion&aacute; un producto de la tabla para ver su historial
                y d&oacute;nde conviene comprarlo.
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
