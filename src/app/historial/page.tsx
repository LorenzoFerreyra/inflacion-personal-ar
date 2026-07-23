"use client";

import { useState, useEffect } from "react";
import { Product, Category, PricePoint } from "@/lib/types";
import { PERIODS, PAGE_SIZE, MAX_COMPARE_PRODUCTS } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { useDebounce } from "@/lib/useDebounce";
import { Search, ArrowRight } from "@/components/Icons";
import { chainLabel } from "@/lib/chainColors";
import ProductImage from "@/components/ProductImage";
import VariationBadge from "@/components/VariationBadge";
import Link from "next/link";
import PriceChart from "@/components/PriceChart";
import Pagination from "@/components/Pagination";
import { fmtPct } from "@/lib/format";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function HistorialPage() {
  const { period } = usePeriod();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cadena, setCadena] = useState("");
  const [chains, setChains] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryHistory, setCategoryHistory] = useState<PricePoint[]>([]);
  const [loadingCategoryHistory, setLoadingCategoryHistory] = useState(false);

  const [compareEans, setCompareEans] = useState<Set<string>>(new Set());
  const [compareProducts, setCompareProducts] = useState<
    { product: Product; history: PricePoint[] }[]
  >([]);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCategories(data))
      .catch(() => {});
    fetch("/api/chains-list")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setChains(data))
      .catch(() => {});
  }, []);

  // Reset page when a filter changes — during render, so the fetch effect
  // below never runs with the stale page number.
  const filtersKey = `${debouncedSearch}|${category}|${cadena}|${period}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }

  // Clear the category trend as soon as the category changes.
  const [prevCategory, setPrevCategory] = useState(category);
  if (category !== prevCategory) {
    setPrevCategory(category);
    setCategoryHistory([]);
  }

  useEffect(() => {
    const abort = new AbortController();

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: debouncedSearch,
          category,
          cadena,
          dias: String(PERIODS[period].dias),
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/products?${params}`, {
          signal: abort.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProducts(data.products);
        setTotalCount(data.total);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setProducts([]);
          setTotalCount(0);
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    })();

    return () => abort.abort();
  }, [debouncedSearch, category, cadena, period, page]);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;

    (async () => {
      setLoadingCategoryHistory(true);
      try {
        const res = await fetch(
          `/api/category-history?category=${encodeURIComponent(category)}`,
        );
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setCategoryHistory(data);
      } catch {
        if (!cancelled) setCategoryHistory([]);
      } finally {
        if (!cancelled) setLoadingCategoryHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [category]);

  function toggleCompare(product: Product) {
    setCompareEans((prev) => {
      const next = new Set(prev);
      if (next.has(product.ean)) {
        next.delete(product.ean);
      } else if (next.size < MAX_COMPARE_PRODUCTS) {
        next.add(product.ean);
      }
      return next;
    });
  }

  // Clear the compare panel as soon as the selection empties.
  const [prevCompareEans, setPrevCompareEans] = useState(compareEans);
  if (compareEans !== prevCompareEans) {
    setPrevCompareEans(compareEans);
    if (compareEans.size === 0) setCompareProducts([]);
  }

  useEffect(() => {
    if (compareEans.size === 0) return;
    let cancelled = false;

    (async () => {
      setLoadingCompare(true);
      try {
        const results = await Promise.allSettled(
          Array.from(compareEans).map(async (ean) => {
            const [prodRes, histRes] = await Promise.all([
              fetch(`/api/product?ean=${ean}`),
              fetch(`/api/history?ean=${ean}`),
            ]);
            const prodData = prodRes.ok ? await prodRes.json() : null;
            const histData = histRes.ok ? await histRes.json() : null;
            return {
              product: prodData?.product as Product,
              history: (histData?.average ?? []) as PricePoint[],
            };
          }),
        );
        if (!cancelled) {
          setCompareProducts(
            results
              .filter(
                (r): r is PromiseFulfilledResult<{ product: Product; history: PricePoint[] }> =>
                  r.status === "fulfilled" && r.value.product != null,
              )
              .map((r) => r.value),
          );
        }
      } catch {
        if (!cancelled) setCompareProducts([]);
      } finally {
        if (!cancelled) setLoadingCompare(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [compareEans]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-zinc-50">
          Historial de precios
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Explorá la evolución histórica de precios, compará productos y
          descubrí tendencias por categoría.
        </p>
      </div>

      {/* Compare panel */}
      {compareEans.size > 0 && (
        <ComparePanel
          products={compareProducts}
          loading={loadingCompare}
          onRemove={(ean) =>
            setCompareEans((prev) => {
              const next = new Set(prev);
              next.delete(ean);
              return next;
            })
          }
          onClear={() => setCompareEans(new Set())}
        />
      )}

      {/* Category trend */}
      {category && (
        <CategoryTrend
          category={category}
          history={categoryHistory}
          loading={loadingCategoryHistory}
        />
      )}

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-panel border border-hairline-strong rounded-sm pl-10 pr-4 py-2.5
                       text-sm text-zinc-100 focus:outline-none"
          />
        </div>
        <select
          value={cadena}
          onChange={(e) => setCadena(e.target.value)}
          className="bg-panel border border-hairline-strong rounded-sm px-3 py-2.5
                     text-sm text-zinc-300 focus:outline-none"
        >
          <option value="">Todos los supermercados</option>
          {chains.map((ch) => (
            <option key={ch} value={ch}>
              {chainLabel(ch)}
            </option>
          ))}
        </select>
      </div>

      {/* Category filters: editorial underline tags */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-hairline pb-2">
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
        {categories.slice(0, 12).map((cat) => (
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
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Cargando productos...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 text-sm">
          No se encontraron productos.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((product) => (
            <ProductCard
              key={product.ean}
              product={product}
              isComparing={compareEans.has(product.ean)}
              canCompare={compareEans.size < MAX_COMPARE_PRODUCTS}
              onToggleCompare={() => toggleCompare(product)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        label="productos"
      />
    </div>
  );
}

function ProductCard({
  product,
  isComparing,
  canCompare,
  onToggleCompare,
}: {
  product: Product;
  isComparing: boolean;
  canCompare: boolean;
  onToggleCompare: () => void;
}) {
  return (
    <div
      className={`group border rounded-sm p-4 ${
        isComparing
          ? "bg-amber-tint border-amber-450"
          : "bg-panel border-hairline hover:border-hairline-strong"
      }`}
    >
      <div className="flex items-start gap-3">
        <ProductImage
          src={product.image_url}
          alt={product.product_description}
          marca={product.marca}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-200 truncate">
            {product.product_description}
          </h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {product.marca} · {product.categoria}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-hairline">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-100 tabular">
            ${product.precio_actual?.toLocaleString("es-AR")}
          </span>
          <VariationBadge value={product.variacion_pct} />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleCompare();
            }}
            disabled={!isComparing && !canCompare}
            className={`px-2 py-1 rounded-sm text-[11px] font-medium border ${
              isComparing
                ? "bg-amber-tint-2 text-amber-300 border-transparent"
                : canCompare
                  ? "text-zinc-400 hover:text-zinc-200 border-hairline-strong"
                  : "text-zinc-600 border-hairline cursor-not-allowed"
            }`}
          >
            {isComparing ? "Quitar" : "Comparar"}
          </button>
          <Link
            href={`/historial/${product.ean}`}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium
                       text-amber-400 hover:text-amber-300 underline decoration-dotted decoration-amber-400/50 underline-offset-4"
          >
            Ver historial
            <ArrowRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ComparePanel({
  products,
  loading,
  onRemove,
  onClear,
}: {
  products: { product: Product; history: PricePoint[] }[];
  loading: boolean;
  onRemove: (ean: string) => void;
  onClear: () => void;
}) {
  const COMPARE_COLORS = ["#d9a64e", "#6ee7b7", "#7dd3fc", "#c4b5fd"];

  const mergedData = (() => {
    const dateMap = new Map<string, Record<string, number>>();
    for (let i = 0; i < products.length; i++) {
      const { product, history } = products[i];
      for (const pt of history) {
        const existing = dateMap.get(pt.fecha) || {};
        existing[product.ean] = pt.precio_promedio;
        dateMap.set(pt.fecha, existing);
      }
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, values]) => ({ fecha, ...values }));
  })();

  return (
    <div className="bg-panel border border-hairline rounded-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-50 flex items-center gap-2">
          Comparación de productos ({products.length}/{MAX_COMPARE_PRODUCTS})
        </h3>
        <button
          onClick={onClear}
          className="text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Limpiar
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {products.map((item, i) => (
          <button
            key={item.product.ean}
            onClick={() => onRemove(item.product.ean)}
            className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 group"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COMPARE_COLORS[i] }}
            />
            <span className="truncate max-w-45">
              {item.product.product_description}
            </span>
            <span className="text-zinc-600 group-hover:text-red-400">×</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        </div>
      ) : mergedData.length > 1 ? (
        <CompareChart
          data={mergedData}
          products={products}
          colors={COMPARE_COLORS}
        />
      ) : (
        <div className="text-center py-6 text-zinc-500 text-sm">
          No hay suficientes datos para comparar.
        </div>
      )}
    </div>
  );
}

function CompareChart({
  data,
  products,
  colors,
}: {
  data: Record<string, unknown>[];
  products: { product: Product; history: PricePoint[] }[];
  colors: string[];
}) {
  return (
    <div className="border-t border-hairline pt-3">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <XAxis
            dataKey="fecha"
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "#27272a40" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val: number) => `$${val.toLocaleString("es-AR")}`}
            width={65}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#121214",
              border: "1px solid #3f3f46",
              borderRadius: "4px",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "#71717a", fontSize: "11px" }}
            formatter={(value, name) => {
              const numValue = Number(value ?? 0);
              const p = products.find((pp) => pp.product.ean === name);
              return [
                `$${numValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`,
                p?.product.product_description ?? String(name ?? ""),
              ];
            }}
          />
          {products.map((item, i) => (
            <Line
              key={item.product.ean}
              type="monotone"
              dataKey={item.product.ean}
              stroke={colors[i]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryTrend({
  category,
  history,
  loading,
}: {
  category: string;
  history: PricePoint[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-panel border border-hairline rounded-sm p-5">
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-zinc-800 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (history.length < 2) return null;

  const first = history[0].precio_promedio;
  const last = history[history.length - 1].precio_promedio;
  const changePct = ((last - first) / first) * 100;

  return (
    <div className="bg-panel border border-hairline rounded-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-50">
          Tendencia: {category}
        </h3>
        <span
          className={`tabular text-sm font-bold ${
            changePct > 0 ? "text-red-400" : "text-green-400"
          }`}
        >
          {fmtPct(changePct)}
        </span>
      </div>
      <PriceChart
        data={{ average: history, byChain: {} }}
        selectedChains={new Set()}
        height={180}
      />
    </div>
  );
}
