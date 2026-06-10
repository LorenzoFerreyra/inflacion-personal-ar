"use client";

import { useState, useEffect, useCallback } from "react";
import ProductTable from "@/components/ProductTable";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import Stepper from "@/components/Stepper";
import { Product, ChainPrice, Category } from "@/lib/types";
import { IPC, PERIODS, PAGE_SIZE } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { X, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react";

const STEP_LABELS = ["Elegir", "Revisar", "Resultados"];

export default function MiCanastaPage() {
  const { period } = usePeriod();

  // ─── Wizard state ───────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ─── Search state ───────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Basket state ───────────────────────────────────────────────────
  const [basket, setBasket] = useState<Product[]>([]);

  // ─── Results state ──────────────────────────────────────────────────
  const [result, setResult] = useState<{
    personal: number;
    ipc: number;
    diff: number;
    products: Product[];
    chains: ChainPrice[];
  } | null>(null);
  const [calculating, setCalculating] = useState(false);

  // ─── Load categories once ───────────────────────────────────────────
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, []);

  // ─── Fetch products on filter change ────────────────────────────────
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

  // ─── Handlers ───────────────────────────────────────────────────────

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
    setCalculating(true);

    const eans = basket.map((p) => p.ean);

    const params = new URLSearchParams({
      eans: eans.join(","),
      dias: String(PERIODS[period].dias),
      pageSize: "200",
    });

    const [productsRes, chainsRes] = await Promise.all([
      fetch(`/api/products?${params}`),
      fetch(`/api/chains?eans=${eans.join(",")}`),
    ]);

    const basketProducts: Product[] = await productsRes.json();
    const chains: ChainPrice[] = await chainsRes.json();

    const validVariations = basketProducts
      .map((p) => p.variacion_pct)
      .filter((v): v is number => v !== null);

    const personal =
      validVariations.length > 0
        ? validVariations.reduce((a, b) => a + b, 0) / validVariations.length
        : 0;

    const ipc = IPC[period];

    setResult({
      personal: Math.round(personal * 10) / 10,
      ipc,
      diff: Math.round((personal - ipc) * 10) / 10,
      products: basketProducts.sort(
        (a, b) => (b.variacion_pct ?? 0) - (a.variacion_pct ?? 0)
      ),
      chains,
    });

    setCalculating(false);
    setStep(3);
  }

  function reset() {
    setStep(1);
    setResult(null);
  }

  // ─── Render ─────────────────────────────────────────────────────────

  const basketEans = new Set(basket.map((p) => p.ean));

  return (
    <div>
      <Stepper currentStep={step} steps={STEP_LABELS} />

      {/* ── STEP 1: Search + Basket sidebar ── */}
      {step === 1 && (
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Buscar productos
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
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2
                           text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
              >
                <option value="">Todas las categor&iacute;as</option>
                {categories.map((cat) => (
                  <option key={cat.categoria} value={cat.categoria}>
                    {cat.categoria} ({cat.n})
                  </option>
                ))}
              </select>
            </div>

            <ProductTable
              products={products}
              page={page}
              onPageChange={setPage}
              onSelect={addToBasket}
              selectedEans={basketEans}
              loading={loading}
            />
          </div>

          {/* Basket sidebar */}
          <div className="w-80 flex-shrink-0">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Tu canasta
            </h2>

            {basket.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Hac&eacute; click en productos de la tabla para agregarlos.
              </p>
            ) : (
              <>
                <ul className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                  {basket.map((p) => (
                    <li
                      key={p.ean}
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800
                                 rounded-md px-3 py-2 text-sm"
                    >
                      <div className="min-w-0 mr-2">
                        <span className="text-zinc-200 truncate block">
                          {p.product_description}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ${p.precio_actual?.toLocaleString("es-AR")}
                          {p.variacion_pct !== null && (
                            <span
                              className={`ml-2 ${
                                p.variacion_pct > 0
                                  ? "text-red-400"
                                  : "text-green-400"
                              }`}
                            >
                              {p.variacion_pct > 0 ? "+" : ""}
                              {p.variacion_pct}%
                            </span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromBasket(p.ean)}
                        className="text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0"
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
                  onClick={() => setStep(2)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500
                             text-white font-medium py-2.5 rounded-md transition-colors text-sm"
                >
                  Revisar canasta
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Basket review ── */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Revisar tu canasta
          </h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                  <th className="py-3 px-4 font-medium">Producto</th>
                  <th className="py-3 px-4 font-medium">Marca</th>
                  <th className="py-3 px-4 font-medium text-right">Precio</th>
                  <th className="py-3 px-4 font-medium text-right">Var %</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {basket.map((p) => (
                  <tr key={p.ean} className="border-b border-zinc-800/50">
                    <td className="py-2.5 px-4 text-zinc-200">
                      {p.product_description}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400">{p.marca}</td>
                    <td className="py-2.5 px-4 text-right text-zinc-200">
                      ${p.precio_actual?.toLocaleString("es-AR") ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {p.variacion_pct !== null ? (
                        <span
                          className={`font-medium ${
                            p.variacion_pct > 0
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {p.variacion_pct > 0 ? "+" : ""}
                          {p.variacion_pct}%
                        </span>
                      ) : (
                        <span className="text-zinc-500">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => removeFromBasket(p.ean)}
                        className="text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Productos en canasta</p>
                <p className="text-2xl font-bold text-zinc-100">
                  {basket.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">
                  Per&iacute;odo de comparaci&oacute;n
                </p>
                <p className="text-lg font-semibold text-zinc-100">
                  {PERIODS[period].label}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md
                         bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium transition-colors"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              onClick={calculate}
              disabled={calculating || basket.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500
                         text-white font-medium py-2.5 rounded-md transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {calculating ? "Calculando..." : "Calcular mi inflación"}
              {!calculating && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Results ── */}
      {step === 3 && result && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label="Tu inflación personal"
              value={`${result.personal}%`}
              subtitle={PERIODS[period].label.toLowerCase()}
              color={result.personal > result.ipc ? "red" : "green"}
            />
            <KpiCard
              label="IPC oficial"
              value={`${result.ipc}%`}
              subtitle={PERIODS[period].label.toLowerCase()}
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

          {/* Bottom row: ranked products + chain chart */}
          <div className="grid grid-cols-2 gap-6">
            {/* Ranked products */}
            <div>
              <h3 className="text-base font-medium text-zinc-200 mb-3">
                Productos por variaci&oacute;n
              </h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-left">
                      <th className="py-2.5 px-3 font-medium">#</th>
                      <th className="py-2.5 px-3 font-medium">Producto</th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Var %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.products.map((p, i) => (
                      <tr key={p.ean} className="border-b border-zinc-800/50">
                        <td className="py-2 px-3 text-zinc-500">{i + 1}</td>
                        <td className="py-2 px-3 text-zinc-200 truncate max-w-64">
                          {p.product_description}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {p.variacion_pct !== null ? (
                            <span
                              className={`font-medium ${
                                p.variacion_pct > 0
                                  ? "text-red-400"
                                  : "text-green-400"
                              }`}
                            >
                              {p.variacion_pct > 0 ? "+" : ""}
                              {p.variacion_pct}%
                            </span>
                          ) : (
                            <span className="text-zinc-500">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chain chart */}
            {result.chains.length > 0 && (
              <div>
                <h3 className="text-base font-medium text-zinc-200 mb-3">
                  Precio promedio por cadena
                </h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                  <ChainBarChart data={result.chains} height={300} />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md
                         bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium transition-colors"
            >
              <RotateCcw size={16} />
              Nueva canasta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
