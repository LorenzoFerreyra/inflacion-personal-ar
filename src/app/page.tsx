/**
 * page.tsx — "Mi canasta"
 *
 * Flujo principal:
 *   1. El usuario busca productos (por texto y/o categoría)
 *   2. Clickea productos para agregarlos a su canasta
 *   3. Presiona "Calcular" para ver su inflación personal vs. IPC oficial
 *   4. Ve un breakdown por producto y un ranking de cadenas
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import ProductTable from "@/components/ProductTable";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import { Product, ChainPrice, Category } from "@/lib/types";
import { IPC, PERIODS, PeriodKey, PAGE_SIZE } from "@/lib/constants";
import { X } from "lucide-react";

export default function MiCanastaPage() {
  // ─── Estado de búsqueda ──────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Estado de canasta ───────────────────────────────────────────────
  const [basket, setBasket] = useState<Product[]>([]);

  // ─── Estado de resultados (post-cálculo) ─────────────────────────────
  const [result, setResult] = useState<{
    personal: number;
    ipc: number;
    diff: number;
    products: Product[];
    chains: ChainPrice[];
  } | null>(null);

  // ─── Cargar categorías una vez ───────────────────────────────────────
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, []);

  // ─── Buscar productos cuando cambian los filtros ─────────────────────
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
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }, [search, category, period, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [search, category, period]);

  // ─── Handlers ────────────────────────────────────────────────────────

  function addToBasket(product: Product) {
    setBasket((prev) => {
      if (prev.some((p) => p.ean === product.ean)) return prev;
      return [...prev, product];
    });
  }

  function removeFromBasket(ean: string) {
    setBasket((prev) => prev.filter((p) => p.ean !== ean));
  }

  async function calculate() {
    if (basket.length === 0) return;

    const eans = basket.map((p) => p.ean);

    // Traer datos actualizados para los EANs de la canasta
    const params = new URLSearchParams({
      eans: eans.join(","),
      dias: String(PERIODS[period].dias),
      pageSize: "200",
    });
    const productsRes = await fetch(`/api/products?${params}`);
    const basketProducts: Product[] = await productsRes.json();

    // Traer precios por cadena
    const chainsRes = await fetch(`/api/chains?eans=${eans.join(",")}`);
    const chains: ChainPrice[] = await chainsRes.json();

    // Calcular inflación personal (promedio de variaciones)
    const validVariations = basketProducts
      .map((p) => p.variacion_pct)
      .filter((v): v is number => v !== null);

    const personal =
      validVariations.length > 0
        ? validVariations.reduce((a, b) => a + b, 0) / validVariations.length
        : 0;

    const ipc = IPC[period];
    const diff = personal - ipc;

    setResult({
      personal: Math.round(personal * 10) / 10,
      ipc,
      diff: Math.round(diff * 10) / 10,
      products: basketProducts,
      chains,
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────

  const basketEans = new Set(basket.map((p) => p.ean));

  return (
    <div className="flex gap-6">
      {/* Panel izquierdo: búsqueda y tabla */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Buscar productos
        </h2>

        {/* Filtros */}
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
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2
                       text-sm text-zinc-300
                       focus:outline-none focus:border-zinc-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.categoria} value={cat.categoria}>
                {cat.categoria} ({cat.n})
              </option>
            ))}
          </select>
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

        {/* Tabla de resultados */}
        <ProductTable
          products={products}
          page={page}
          onPageChange={setPage}
          onSelect={addToBasket}
          selectedEans={basketEans}
          loading={loading}
        />
      </div>

      {/* Panel derecho: canasta */}
      <div className="w-80 flex-shrink-0">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          Tu canasta
        </h2>

        {basket.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Hacé click en productos de la tabla para agregarlos.
          </p>
        ) : (
          <>
            {/* Lista de productos en canasta */}
            <ul className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {basket.map((p) => (
                <li
                  key={p.ean}
                  className="flex items-center justify-between bg-zinc-900 border border-zinc-800
                             rounded-md px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200 truncate mr-2">
                    {p.product_description}
                  </span>
                  <button
                    onClick={() => removeFromBasket(p.ean)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>

            <p className="text-sm text-zinc-400 mb-3">
              {basket.length} producto{basket.length !== 1 ? "s" : ""} en tu
              canasta
            </p>

            <button
              onClick={calculate}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium
                         py-2.5 rounded-md transition-colors text-sm"
            >
              Calcular mi inflación
            </button>
          </>
        )}

        {/* Resultados */}
        {result && (
          <div className="mt-6 space-y-4">
            <hr className="border-zinc-800" />
            <h3 className="text-sm font-semibold text-zinc-300">
              Tu resultado ({PERIODS[period].label.toLowerCase()})
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <KpiCard
                label="Tu inflación"
                value={`${result.personal}%`}
                color={result.personal > result.ipc ? "red" : "green"}
              />
              <KpiCard
                label="IPC oficial"
                value={`${result.ipc}%`}
              />
              <KpiCard
                label="Diferencia"
                value={`${result.diff > 0 ? "+" : ""}${result.diff} pp`}
                subtitle={
                  result.diff > 0 ? "por encima del IPC" : "por debajo del IPC"
                }
                color={result.diff > 0 ? "red" : "green"}
              />
            </div>

            {/* Ranking cadenas */}
            {result.chains.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Precio de tu canasta por cadena
                </h4>
                <ChainBarChart data={result.chains} height={180} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
