"use client";

import { useState, useEffect, useCallback } from "react";
import { Product, Category, PricePoint } from "@/lib/types";
import { PERIODS, PAGE_SIZE, MAX_COMPARE_PRODUCTS } from "@/lib/constants";
import { usePeriod } from "@/lib/PeriodContext";
import { useDebounce } from "@/lib/useDebounce";
import { Search, TrendingUp, ArrowRight } from "@/components/Icons";
import { chainLabel } from "@/lib/chainColors";
import ProductImage from "@/components/ProductImage";
import Link from "next/link";
import PriceChart from "@/components/PriceChart";
import Pagination from "@/components/Pagination";
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

  const fetchProducts = useCallback(async () => {
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
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProducts(data.products);
      setTotalCount(data.total);
    } catch {
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, cadena, period, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, cadena, period]);

  useEffect(() => {
    if (!category) {
      setCategoryHistory([]);
      return;
    }
    setLoadingCategoryHistory(true);
    fetch(`/api/category-history?category=${encodeURIComponent(category)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategoryHistory)
      .catch(() => setCategoryHistory([]))
      .finally(() => setLoadingCategoryHistory(false));
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

  useEffect(() => {
    if (compareEans.size === 0) {
      setCompareProducts([]);
      return;
    }
    setLoadingCompare(true);
    Promise.allSettled(
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
    )
      .then((results) =>
        setCompareProducts(
          results
            .filter(
              (r): r is PromiseFulfilledResult<{ product: Product; history: PricePoint[] }> =>
                r.status === "fulfilled" && r.value.product != null,
            )
            .map((r) => r.value),
        ),
      )
      .catch(() => setCompareProducts([]))
      .finally(() => setLoadingCompare(false));
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
          <option value="">Todos los supermercados</option>
          {chains.map((ch) => (
            <option key={ch} value={ch}>
              {chainLabel(ch)}
            </option>
          ))}
        </select>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory("")}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${
            category === ""
              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
              : "bg-zinc-900/40 text-zinc-400 border-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/60"
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
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border ${
              category === cat.categoria
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-zinc-900/40 text-zinc-400 border-zinc-800/40 hover:text-zinc-200 hover:border-zinc-700/60"
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
      className={`group bg-zinc-900/50 border rounded-xl p-4 transition-all ${
        isComparing
          ? "border-amber-500/40 ring-1 ring-amber-500/20"
          : "border-zinc-800/50 hover:border-zinc-700/60"
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

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/40">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-zinc-100 font-mono">
            ${product.precio_actual?.toLocaleString("es-AR")}
          </span>
          {product.variacion_pct !== null && (
            <span
              className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${
                product.variacion_pct > 0
                  ? "bg-red-500/10 text-red-400"
                  : product.variacion_pct < 0
                    ? "bg-green-500/10 text-green-400"
                    : "bg-zinc-800/50 text-zinc-400"
              }`}
            >
              {product.variacion_pct > 0 ? "+" : ""}
              {product.variacion_pct}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleCompare();
            }}
            disabled={!isComparing && !canCompare}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
              isComparing
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : canCompare
                  ? "text-zinc-500 hover:text-zinc-300 border border-zinc-800/40 hover:border-zinc-700/60"
                  : "text-zinc-600 border border-zinc-800/30 cursor-not-allowed"
            }`}
          >
            {isComparing ? "Quitar" : "Comparar"}
          </button>
          <Link
            href={`/historial/${product.ean}`}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                       text-amber-400/80 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40
                       transition-all"
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
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <TrendingUp size={16} className="text-amber-400" />
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
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 p-3">
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
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "10px",
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
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
        <div className="flex items-center justify-center py-6">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (history.length < 2) return null;

  const first = history[0].precio_promedio;
  const last = history[history.length - 1].precio_promedio;
  const changePct = ((last - first) / first) * 100;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">
          Tendencia: {category}
        </h3>
        <span
          className={`text-sm font-semibold px-2 py-0.5 rounded-md ${
            changePct > 0
              ? "bg-red-500/10 text-red-400"
              : "bg-green-500/10 text-green-400"
          }`}
        >
          {changePct > 0 ? "+" : ""}
          {changePct.toFixed(1)}%
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
