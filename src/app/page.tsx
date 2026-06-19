"use client";

import { useState, useMemo } from "react";
import ProductTable from "@/components/ProductTable";
import KpiCard from "@/components/KpiCard";
import ChainBarChart from "@/components/ChainBarChart";
import Stepper from "@/components/Stepper";
import { Product, ChainPrice } from "@/lib/types";
import { PERIODS } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { useProducts } from "@/lib/useProducts";
import {
  X,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  ShoppingBasket,
} from "@/components/Icons";
import ProductImage from "@/components/ProductImage";
import VariationBadge from "@/components/VariationBadge";
import { chainLabel } from "@/lib/chainColors";

const STEP_LABELS = ["Elegir", "Revisar", "Resultados"];

export default function MiCanastaPage() {
  const { period, ipc: ipcValues } = usePeriod();
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

  const [step, setStep] = useState(1);
  const [basket, setBasket] = useState<Product[]>([]);
  const [result, setResult] = useState<{
    personal: number;
    ipc: number;
    diff: number;
    products: Product[];
    chains: ChainPrice[];
  } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
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

      if (!productsRes.ok || !chainsRes.ok)
        throw new Error("Error al obtener datos");

      const { products: basketProducts } = (await productsRes.json()) as {
        products: Product[];
        total: number;
      };
      const chains: ChainPrice[] = await chainsRes.json();

      const validVariations = basketProducts
        .map((p) => p.variacion_pct)
        .filter((v): v is number => v !== null);

      const personal =
        validVariations.length > 0
          ? validVariations.reduce((a, b) => a + b, 0) / validVariations.length
          : 0;

      const ipc = ipcValues[period];

      setResult({
        personal: Math.round(personal * 10) / 10,
        ipc,
        diff: Math.round((personal - ipc) * 10) / 10,
        products: [...basketProducts].sort(
          (a, b) => (b.variacion_pct ?? 0) - (a.variacion_pct ?? 0),
        ),
        chains,
      });

      setStep(3);
    } catch (err) {
      setError("Error al obtener datos. Reintentá más tarde.");
    } finally {
      setCalculating(false);
    }
  }

  function reset() {
    setStep(1);
    setResult(null);
  }

  const basketEans = useMemo(() => new Set(basket.map((p) => p.ean)), [basket]);

  return (
    <div>
      <Stepper currentStep={step} steps={STEP_LABELS} />

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">
              Buscar productos
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca o EAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-4 py-2.5
                             text-sm text-zinc-200 placeholder-zinc-500
                             focus:outline-none focus:border-amber-500/40"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-3 py-2.5
                           text-sm text-zinc-300 focus:outline-none focus:border-amber-500/40"
              >
                <option value="">
                  {categoriesError
                    ? "Error al cargar categorías"
                    : "Todas las categorías"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.categoria} value={cat.categoria}>
                    {cat.categoria}
                  </option>
                ))}
              </select>
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

            <ProductTable
              products={products}
              page={page}
              totalCount={totalCount}
              onPageChange={setPage}
              onSelect={addToBasket}
              selectedEans={basketEans}
              loading={loading}
            />
          </div>

          {/* Basket sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">
                Tu canasta
              </h2>

              {basket.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-zinc-800/60 p-8 text-center">
                  <ShoppingBasket
                    size={36}
                    strokeWidth={1.2}
                    className="mx-auto text-zinc-700 mb-3"
                  />
                  <p className="text-sm text-zinc-500">
                    Hac&eacute; click en productos de la tabla para agregarlos.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2 mb-4 max-h-105 overflow-y-auto pr-1">
                    {basket.map((p) => (
                      <li
                        key={p.ean}
                        className="group flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50
                                   rounded-lg px-3 py-2.5 text-sm hover:border-zinc-700/60"
                      >
                        <ProductImage
                          src={p.image_url}
                          alt={p.product_description}
                          marca={p.marca}
                        />
                        <div className="min-w-0 mr-2">
                          <span className="text-zinc-200 truncate block text-[13px] font-medium">
                            {p.product_description}
                          </span>
                          <span className="text-xs text-zinc-500">
                            ${p.precio_actual?.toLocaleString("es-AR")}
                            {p.variacion_pct !== null && (
                              <span
                                className={`ml-2 font-medium ${
                                  p.variacion_pct > 0
                                    ? "text-red-400/80"
                                    : "text-green-400/80"
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
                          className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <p className="text-[13px] text-zinc-400 mb-3 font-medium">
                    {basket.length} producto{basket.length !== 1 ? "s" : ""}{" "}
                    seleccionado{basket.length !== 1 ? "s" : ""}
                  </p>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25
                               text-amber-300 font-semibold py-3 rounded-xl text-sm border border-amber-500/20
                               hover:border-amber-500/40"
                  >
                    Revisar canasta
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          <h2 className="text-lg font-semibold text-zinc-100 mb-5">
            Revisar tu canasta
          </h2>

          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80">
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Marca
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Var %
                  </th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {basket.map((p) => (
                  <tr
                    key={p.ean}
                    className="border-b border-zinc-800/30 hover:bg-zinc-800/20"
                  >
                    <td className="py-2.5 px-4 text-zinc-200 font-medium text-[13px]">
                      {p.product_description}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 text-[13px]">
                      {p.marca}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-200 font-mono text-[13px]">
                      ${p.precio_actual?.toLocaleString("es-AR") ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <VariationBadge value={p.variacion_pct} />
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => removeFromBasket(p.ean)}
                        className="text-zinc-600 hover:text-red-400"
                      >
                        <span className="text-[10px]">✕</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-linear-to-br from-zinc-800/40 to-zinc-800/20 border border-zinc-700/40 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-zinc-400 font-medium">
                  Productos en canasta
                </p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">
                  {basket.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-zinc-400 font-medium">
                  Per&iacute;odo
                </p>
                <p className="text-lg font-semibold text-amber-300 mt-1">
                  {PERIODS[period].label}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
                         bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60
                         text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              onClick={calculate}
              disabled={calculating || basket.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25
                         text-amber-300 font-semibold py-3 rounded-xl text-sm border border-amber-500/20
                         hover:border-amber-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {calculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  Calculando...
                </>
              ) : (
                "Calcular mi inflación"
              )}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
          )}
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && result && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Tu inflaci&oacute;n personal"
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
              value={`${result.diff > 0 ? "+" : ""}${result.diff} %`}
              subtitle={
                result.diff > 0 ? "por encima del IPC" : "por debajo del IPC"
              }
              color={result.diff > 0 ? "red" : "green"}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ranked products */}
            <div>
              <h3 className="text-[15px] font-semibold text-zinc-200 mb-3">
                Productos por variaci&oacute;n
              </h3>
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/80">
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        #
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Var %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.products.map((p, i) => (
                      <tr
                        key={p.ean}
                        className="border-b border-zinc-800/30 hover:bg-zinc-800/20"
                      >
                        <td className="py-2 px-3 text-zinc-600 text-[13px] font-mono">
                          {i + 1}
                        </td>
                        <td className="py-2 px-3 text-zinc-200 text-[13px] truncate max-w-64">
                          {p.product_description}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <VariationBadge value={p.variacion_pct} />
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
                <h3 className="text-[15px] font-semibold text-zinc-200 mb-3">
                  Precio promedio por cadena
                </h3>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                  <ChainBarChart data={result.chains} height={300} />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl
                       bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60
                       text-sm font-medium"
          >
            <RotateCcw size={15} />
            Nueva canasta
          </button>
        </div>
      )}
    </div>
  );
}
