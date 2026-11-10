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
import { fmtMes, type RespuestaCanasta } from "@/lib/canasta";

const STEP_LABELS = ["Elegir", "Revisar", "Resultados"];

export default function MiCanastaPage() {
  const { period } = usePeriod();
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
    canasta: RespuestaCanasta;
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
      const eans = basket.map((p) => p.ean).join(",");
      const params = new URLSearchParams({ eans, meses: String(PERIODS[period].meses) });

      const [canastaRes, chainsRes] = await Promise.all([
        fetch(`/api/canasta?${params}`),
        fetch(`/api/chains?eans=${eans}`),
      ]);

      if (!canastaRes.ok || !chainsRes.ok)
        throw new Error("Error al obtener datos");

      setResult({
        canasta: (await canastaRes.json()) as RespuestaCanasta,
        chains: (await chainsRes.json()) as ChainPrice[],
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
          {result.canasta.disponible ? (
            <ResultadoCanastaView canasta={result.canasta} basket={basket} />
          ) : (
            <p className="text-[13px] text-amber-300 bg-amber-tint border border-amber-tint-2 rounded-sm px-4 py-3">
              {result.canasta.motivo}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.canasta.disponible && (
              <ProductosCanasta canasta={result.canasta} basket={basket} />
            )}

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

type CanastaCalculada = Extract<RespuestaCanasta, { disponible: true }>;

function ResultadoCanastaView({
  canasta,
  basket,
}: {
  canasta: CanastaCalculada;
  basket: Product[];
}) {
  const { comparacion } = canasta;
  const meses = `${fmtMes(canasta.desde)} → ${fmtMes(canasta.hasta)}`;
  const color = comparacion
    ? comparacion.diferencia > 0
      ? "red"
      : comparacion.diferencia < 0
        ? "green"
        : "neutral"
    : "neutral";
  const plural = (n: number) => `${n} producto${n === 1 ? "" : "s"}`;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard
          label="Tu canasta"
          value={canasta.canasta ? fmtPct(canasta.canasta.var_pct, false) : "—"}
          subtitle={
            canasta.canasta
              ? `${meses} · ${plural(canasta.canasta.n)} de ${basket.length}`
              : meses
          }
        />
        <KpiCard
          label="INDEC GBA, mismas clases"
          value={comparacion ? fmtPct(comparacion.indec_var, false) : "—"}
          subtitle={comparacion ? `${meses} · ${plural(comparacion.n)}` : "sin comparación"}
        />
        <KpiCard
          label="Diferencia"
          value={comparacion ? `${fmtPct(comparacion.diferencia).replace("%", "")} pp` : "—"}
          subtitle={
            comparacion
              ? `tu canasta ${fmtPct(comparacion.canasta_var)} en esos ${plural(comparacion.n)}`
              : "sin comparación"
          }
          color={color}
        />
      </div>
      {canasta.motivo && (
        <p className="text-[13px] text-amber-300 bg-amber-tint border border-amber-tint-2 rounded-sm px-4 py-3 mt-5">
          {canasta.motivo}
        </p>
      )}
      <p className="text-xs text-zinc-500 mt-4 leading-relaxed max-w-3xl">
        Precio promedio de cada mes calendario en cada cadena; cada producto se compara
        consigo mismo en la misma cadena y todos pesan igual. La columna del INDEC es la
        variación de la clase COICOP de cada producto en GBA, en los mismos meses: lo que
        habría marcado el INDEC para una canasta con la misma composición. Solo entran los
        productos de clases que el INDEC publica por separado.
      </p>
    </div>
  );
}

function ProductosCanasta({
  canasta,
  basket,
}: {
  canasta: CanastaCalculada;
  basket: Product[];
}) {
  const nombres = new Map(basket.map((p) => [p.ean, p.product_description]));
  const filas = [...canasta.productos].sort(
    (a, b) => (b.var_pct ?? -Infinity) - (a.var_pct ?? -Infinity),
  );
  return (
    <div>
      <h3 className="text-[15px] font-medium text-zinc-50 mb-3">
        Productos por variaci&oacute;n
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline-strong">
              <th className="py-2.5 px-3 text-left text-[11px] font-bold text-zinc-400 uppercase">
                Producto
              </th>
              <th className="py-2.5 px-3 text-left text-[11px] font-bold text-zinc-400 uppercase">
                Clase
              </th>
              <th className="py-2.5 px-3 text-right text-[11px] font-bold text-zinc-400 uppercase">
                Var %
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p) => (
              <tr key={p.ean} className="border-b border-hairline hover:bg-panel-2">
                <td className="py-2 px-3 text-zinc-200 text-[13px] truncate max-w-64">
                  {nombres.get(p.ean) ?? p.ean}
                </td>
                <td
                  className="py-2 px-3 text-[12px] tabular text-zinc-500"
                  title={
                    !p.clase_coicop
                      ? "Sin clase COICOP: no entra en la comparación con el INDEC"
                      : p.comparable
                        ? "Entra en la comparación con el INDEC"
                        : "El INDEC no publica esta clase para estos meses"
                  }
                >
                  {p.clase_coicop ?? "—"}
                  {p.clase_coicop && !p.comparable && " *"}
                </td>
                <td className="py-2 px-3 text-right">
                  <VariationBadge value={p.var_pct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-500 mt-2">
        * Clase sin serie del INDEC para estos meses: cuenta para tu canasta pero no para la
        comparación. &ldquo;—&rdquo; en la variación: sin precio en los dos meses.
      </p>
    </div>
  );
}
