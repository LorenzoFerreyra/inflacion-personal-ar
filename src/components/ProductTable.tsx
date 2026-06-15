"use client";

import { Product } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/constants";
import { ChevronLeft, ChevronRight, Package } from "@/components/Icons";
import ProductImage from "@/components/ProductImage";

interface Props {
  products: Product[];
  page: number;
  totalCount: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onSelect?: (product: Product) => void;
  selectedEans?: Set<string>;
  loading?: boolean;
}

export default function ProductTable({
  products,
  page,
  totalCount,
  pageSize = PAGE_SIZE,
  onPageChange,
  onSelect,
  selectedEans,
  loading = false,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-sm">Cargando productos...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
        <Package size={32} strokeWidth={1.2} className="text-zinc-600" />
        <span className="text-sm">No se encontraron productos.</span>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800/60 bg-zinc-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80">
              <th className="py-3 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Producto
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Marca
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Categor&iacute;a
              </th>
              <th className="py-3 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Precio
              </th>
              <th className="py-3 px-3 text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Variaci&oacute;n
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const isSelected = selectedEans?.has(product.ean);

              return (
                <tr
                  key={product.ean}
                  onClick={() => onSelect?.(product)}
                  style={{ animationDelay: `${idx * 20}ms` }}
                  className={`
                    border-b border-zinc-800/30 cursor-pointer animate-fade-in
                    ${
                      isSelected
                        ? "bg-amber-500/8 border-l-2 border-l-amber-400/50"
                        : "hover:bg-zinc-800/40"
                    }
                  `}
                >
                  <td className="py-2.5 px-3 text-zinc-200 font-medium">
                    <div className="flex items-center gap-2.5">
                      <ProductImage
                        src={product.image_url}
                        alt={product.product_description}
                        marca={product.marca}
                      />
                      <span className="truncate">{product.product_description}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500 text-[13px]">
                    {product.marca}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] bg-zinc-800/60 text-zinc-400 rounded-full px-2 py-0.5">
                      {product.categoria}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-200 font-mono text-[13px]">
                    ${product.precio_actual?.toLocaleString("es-AR") ?? "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <VariationBadge value={product.variacion_pct} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={onPageChange} />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const nearby: number[] = [];
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) {
    nearby.push(i);
  }

  const showFirst = nearby[0] > 1;
  const showLast = nearby[nearby.length - 1] < totalPages;
  const gapAfterFirst = nearby[0] > 2;
  const gapBeforeLast = nearby[nearby.length - 1] < totalPages - 1;

  const pgBtn = (n: number, label?: string) => (
    <button
      key={n}
      onClick={() => onPageChange(n)}
      className={`h-8 rounded-md text-[13px] font-medium
        ${label ? "px-3" : "w-8 tabular-nums"}
        ${
          n === page
            ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
        }`}
    >
      {label ?? n}
    </button>
  );

  return (
    <div className="flex items-center justify-between mt-5 px-1">
      <span className="text-[12px] text-zinc-500 tabular-nums font-medium min-w-[120px]">
        {totalCount.toLocaleString("es-AR")} productos
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-100
                     hover:bg-zinc-800/60 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={15} />
        </button>

        {showFirst && pgBtn(1, "Primera")}
        {gapAfterFirst && (
          <span className="w-6 h-8 flex items-center justify-center text-[12px] text-zinc-600">&hellip;</span>
        )}

        {nearby.map((n) => pgBtn(n))}

        {gapBeforeLast && (
          <span className="w-6 h-8 flex items-center justify-center text-[12px] text-zinc-600">&hellip;</span>
        )}
        {showLast && pgBtn(totalPages, "Última")}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-100
                     hover:bg-zinc-800/60 disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <span className="text-[12px] text-zinc-500 tabular-nums font-medium min-w-[120px] text-right">
        Pág. {page} de {totalPages.toLocaleString("es-AR")}
      </span>
    </div>
  );
}

function VariationBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-600">—</span>;
  }

  const isPositive = value > 0;
  const isZero = value === 0;

  const classes = isZero
    ? "bg-zinc-800/50 text-zinc-400"
    : isPositive
      ? "bg-red-500/10 text-red-400"
      : "bg-green-500/10 text-green-400";

  const sign = isPositive ? "+" : "";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold tabular-nums ${classes}`}
    >
      {sign}
      {value.toFixed(1)}%
    </span>
  );
}
