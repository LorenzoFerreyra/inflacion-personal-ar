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
import { fmtPct } from "@/lib/format";

const STEP_LABELS = ["Elegir", "Revisar", "Resultados"];

export default function MiCanastaPage() {
  const { period, ipc: ipcValues, ipcError } = usePeriod();
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
    } catch {
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
            <h2 className="text-lg font-medium text-zinc-50 mb-4">
              Buscar productos
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-[2] min-w-0 relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca o EAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-panel border border-hairline-strong rounded-sm px-4 py-2.5
                             text-sm text-zinc-100 focus:outline-none"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="sm:w-52 bg-panel border border-hairline-strong rounded-sm px-3 py-2.5
                           text-sm text-zinc-300 focus:outline-none"
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
                className="sm:w-52 bg-panel border border-hairline-strong rounded-sm px-3 py-2.5
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
              <h2 className="text-lg font-medium text-zinc-50 mb-4">
                Tu canasta
              </h2>

              {basket.length === 0 ? (
                <div className="rounded-sm border border-dashed border-zinc-800 p-10 text-center">
                  <ShoppingBasket
                    size={32}
                    strokeWidth={1.2}
                    className="mx-auto text-zinc-600 mb-4"
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
                        className="group flex items-center justify-between bg-panel border border-hairline
                                   rounded-sm px-3 py-2.5 text-sm hover:border-hairline-strong"
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
                          <span className="text-xs text-zinc-500 tabular">
                            ${p.precio_actual?.toLocaleString("es-AR")}
                            {p.variacion_pct !== null && (
                              <span
                                className={`ml-2 font-bold ${
                                  p.variacion_pct > 0
                                    ? "text-red-400"
                                    : "text-green-400"
                                }`}
                              >
                                {fmtPct(p.variacion_pct)}
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromBasket(p.ean); }}
                          aria-label={`Quitar ${p.product_description}`}
                          className="text-zinc-500 hover:text-red-400 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                    className="w-full flex items-center justify-center gap-2 bg-amber-450 hover:bg-amber-400
                               text-zinc-950 font-bold py-3 rounded-sm text-sm"
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
          <h2 className="text-lg font-medium text-zinc-50 mb-5">
            Revisar tu canasta
          </h2>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline-strong">
                  <th className="py-2.5 px-4 text-left text-[11px] font-bold text-zinc-400 uppercase">
                    Producto
                  </th>
                  <th className="py-2.5 px-4 text-left text-[11px] font-bold text-zinc-400 uppercase">
                    Marca
                  </th>
                  <th className="py-2.5 px-4 text-right text-[11px] font-bold text-zinc-400 uppercase">
                    Precio
                  </th>
                  <th className="py-2.5 px-4 text-right text-[11px] font-bold text-zinc-400 uppercase">
                    Var %
                  </th>
                  <th className="py-2.5 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {basket.map((p) => (
                  <tr
                    key={p.ean}
                    className="border-b border-hairline hover:bg-panel-2"
                  >
                    <td className="py-2.5 px-4 text-zinc-200 font-medium text-[13px] truncate max-w-48" title={p.product_description}>
                      {p.product_description}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 text-[13px]">
                      {p.marca}
                    </td>
                    <td className="py-2.5 px-4 text-right text-zinc-200 tabular text-[13px]">
                      ${p.precio_actual?.toLocaleString("es-AR") ?? "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <VariationBadge value={p.variacion_pct} />
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => removeFromBasket(p.ean)}
                        aria-label={`Quitar ${p.product_description}`}
                        className="text-zinc-500 hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex gap-12 border-t-2 border-zinc-200 pt-3 mb-8">
            <div>
              <p className="text-[13px] text-zinc-400">Productos en canasta</p>
              <p className="font-display text-3xl font-semibold text-zinc-50 mt-1 tabular-nums">
                {basket.length}
              </p>
            </div>
            <div>
              <p className="text-[13px] text-zinc-400">Per&iacute;odo</p>
              <p className="font-display text-3xl font-semibold text-amber-300 mt-1">
                {PERIODS[period].label}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm
                         border border-hairline-strong text-zinc-300 hover:bg-panel-2
                         text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Volver
            </button>
            <button
              onClick={calculate}
              disabled={calculating || basket.length === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-450 hover:bg-amber-400
                         text-zinc-950 font-bold py-3 rounded-sm text-sm
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {calculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  Calculando...
                </>
              ) : (
                "Calcular mi inflación"
              )}
            </button>
          </div>
          {error && (
            <div className="mt-4 text-center rounded-sm border border-red-900 bg-red-950 p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={calculate}
                className="mt-2 text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && result && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <KpiCard
                label="Tu inflaci&oacute;n personal"
                value={fmtPct(result.personal, false)}
                subtitle={PERIODS[period].label.toLowerCase()}
                color={
                  ipcError
                    ? undefined
                    : result.personal > result.ipc
                      ? "red"
                      : "green"
                }
              />
              <KpiCard
                label="IPC oficial"
                value={ipcError ? "—" : fmtPct(result.ipc, false)}
                subtitle={PERIODS[period].label.toLowerCase()}
              />
              <KpiCard
                label="Diferencia"
                value={ipcError ? "—" : fmtPct(result.diff)}
                subtitle={
                  ipcError
                    ? "IPC no disponible"
                    : result.diff > 0
                      ? "por encima del IPC"
                      : "por debajo del IPC"
                }
                color={
                  ipcError ? undefined : result.diff > 0 ? "red" : "green"
                }
              />
            </div>
            <p className="text-xs text-zinc-500 mt-4">
              Fuente: relevamiento propio de supermercados · IPC oficial: INDEC
              · promedio simple de {result.products.length} producto
              {result.products.length !== 1 ? "s" : ""} de tu canasta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ranked products */}
            <div>
              <h3 className="text-[15px] font-medium text-zinc-50 mb-3">
                Productos por variaci&oacute;n
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline-strong">
                      <th className="py-2.5 px-3 text-left text-[11px] font-bold text-zinc-400 uppercase">
                        #
                      </th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-bold text-zinc-400 uppercase">
                        Producto
                      </th>
                      <th className="py-2.5 px-3 text-right text-[11px] font-bold text-zinc-400 uppercase">
                        Var %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.products.map((p, i) => (
                      <tr
                        key={p.ean}
                        className="border-b border-hairline hover:bg-panel-2"
                      >
                        <td className="py-2 px-3 text-zinc-600 text-[13px] tabular">
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
                <h3 className="text-[15px] font-medium text-zinc-50 mb-3">
                  Precio promedio por cadena
                </h3>
                <div className="border-t border-hairline pt-4">
                  <ChainBarChart data={result.chains} height={300} />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm
                       border border-hairline-strong text-zinc-300 hover:bg-panel-2
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
