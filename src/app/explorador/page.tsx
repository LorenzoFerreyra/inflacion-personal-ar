/**
 * explorador/page.tsx — "Explorador"
 *
 * Permite navegar todos los productos y ver un detalle individual:
 *   - Serie histórica de precios
 *   - Precios por cadena
 *   - Opción de agregar a canasta (futuro: compartir estado con Mi canasta)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import ProductTable from "@/components/ProductTable";
import PriceChart from "@/components/PriceChart";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, PricePoint, ChainPrice } from "@/lib/types";
import { PERIODS, PeriodKey, PAGE_SIZE } from "@/lib/constants";

export default function ExploradorPage() {
  // ─── Estado de búsqueda ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Estado de detalle ───────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [chainPrices, setChainPrices] = useState<ChainPrice[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ─── Buscar productos ────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      dias: String(PERIODS[period].dias),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }, [search, period, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search, period]);

  // ─── Cargar detalle cuando se selecciona un producto ─────────────────
  async function selectProduct(product: Product) {
    setSelectedProduct(product);
    setLoadingDetail(true);

    // Traer historia y cadenas en paralelo
    const [historyRes, chainsRes] = await Promise.all([
      fetch(`/api/history?ean=${product.ean}`),
      fetch(`/api/chains?eans=${product.ean}`),
    ]);

    const history: PricePoint[] = await historyRes.json();
    const chains: ChainPrice[] = await chainsRes.json();

    setPriceHistory(history);
    setChainPrices(chains);
    setLoadingDetail(false);
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6">
      {/* Panel izquierdo: lista de productos */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Explorar productos
        </h2>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por nombre o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2
                       text-sm text-zinc-200 placeholder-zinc-500
                       focus:outline-none focus:border-zinc-500"
          />
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

      {/* Panel derecho: detalle del producto */}
      <div className="w-96 flex-shrink-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Detalle del producto
        </h2>

        {!selectedProduct ? (
          <p className="text-sm text-zinc-500">
            Seleccioná un producto de la tabla para ver su detalle.
          </p>
        ) : loadingDetail ? (
          <p className="text-sm text-zinc-500">Cargando detalle...</p>
        ) : (
          <div className="space-y-5">
            {/* Info básica */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-base font-medium text-zinc-100">
                {selectedProduct.product_description}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                {selectedProduct.marca} · {selectedProduct.categoria}
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

            {/* Gráfico de evolución */}
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-2">
                Evolución de precios
              </h4>
              <PriceChart data={priceHistory} />
            </div>

            {/* Precios por cadena */}
            {chainPrices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Precio por cadena
                </h4>
                <ChainBarChart data={chainPrices} height={160} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
