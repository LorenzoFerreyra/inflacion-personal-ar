"use client";

import { useState, useEffect, useCallback } from "react";
import ProductTable from "@/components/ProductTable";
import PriceChart from "@/components/PriceChart";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, PricePoint, ChainPrice, Category } from "@/lib/types";
import { PERIODS, PAGE_SIZE } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { Plus } from "lucide-react";

export default function ExploradorPage() {
  const { period } = usePeriod();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [chainPrices, setChainPrices] = useState<ChainPrice[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Load categories ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, []);

  // ─── Fetch products ─────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      category,
      dias: String(PERIODS[period].dias),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    const res = await fetch(`/api/products?${params}`);
    setProducts(await res.json());
    setLoading(false);
  }, [search, category, period, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, category, period]);

  // ─── Load detail ────────────────────────────────────────────────────
  async function selectProduct(product: Product) {
    setSelectedProduct(product);
    setLoadingDetail(true);

    const [historyRes, chainsRes] = await Promise.all([
      fetch(`/api/history?ean=${product.ean}`),
      fetch(`/api/chains?eans=${product.ean}`),
    ]);

    setPriceHistory(await historyRes.json());
    setChainPrices(await chainsRes.json());
    setLoadingDetail(false);
  }

  // ─── Cheapest chain ─────────────────────────────────────────────────
  const cheapestChain =
    chainPrices.length > 0
      ? chainPrices.reduce((min, c) =>
          c.precio_promedio_canasta < min.precio_promedio_canasta ? c : min
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
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="Buscar por nombre o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2
                       text-sm text-zinc-200 placeholder-zinc-500
                       focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setCategory("")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              category === ""
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
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
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                category === cat.categoria
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {cat.categoria}
            </button>
          ))}
        </div>

        <ProductTable
          products={products}
          page={page}
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
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Detalle del producto
        </h2>

        {!selectedProduct ? (
          <p className="text-sm text-zinc-500">
            Seleccion&aacute; un producto de la tabla para ver su detalle.
          </p>
        ) : loadingDetail ? (
          <p className="text-sm text-zinc-500">Cargando detalle...</p>
        ) : (
          <div className="space-y-5">
            {/* Basic info */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-base font-medium text-zinc-100">
                {selectedProduct.product_description}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {selectedProduct.marca} &middot; {selectedProduct.categoria}
              </p>
              <div className="flex items-baseline gap-4 mt-3">
                <span className="text-xl font-bold text-zinc-100">
                  ${selectedProduct.precio_actual?.toLocaleString("es-AR")}
                </span>
                {selectedProduct.variacion_pct !== null && (
                  <span
                    className={`text-sm font-medium ${
                      selectedProduct.variacion_pct > 0
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {selectedProduct.variacion_pct > 0 ? "+" : ""}
                    {selectedProduct.variacion_pct}%
                  </span>
                )}
              </div>
            </div>

            {/* Price history chart */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-2">
                Evoluci&oacute;n de precios
              </h4>
              <PriceChart data={priceHistory} />
            </div>

            {/* 2x2 chain prices grid */}
            {chainPrices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Precio por cadena
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {chainPrices.map((c) => (
                    <div
                      key={c.cadena}
                      className={`rounded-lg p-3 text-center ${
                        c.cadena === cheapestChain
                          ? "bg-green-500/10 border-2 border-green-500/40"
                          : "bg-zinc-900 border border-zinc-800"
                      }`}
                    >
                      <p className="text-xs text-zinc-400 truncate">
                        {c.cadena}
                      </p>
                      <p
                        className={`text-lg font-bold mt-1 ${
                          c.cadena === cheapestChain
                            ? "text-green-400"
                            : "text-zinc-200"
                        }`}
                      >
                        $
                        {c.precio_promedio_canasta.toLocaleString("es-AR", {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                      {c.cadena === cheapestChain && (
                        <span className="text-[10px] text-green-400 font-medium uppercase tracking-wide">
                          M&aacute;s barato
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
