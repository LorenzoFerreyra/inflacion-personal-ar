"use client";

import { Product } from "@/lib/types";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

interface Props {
  products: Product[];
  page: number;
  onPageChange: (page: number) => void;
  onSelect?: (product: Product) => void;
  selectedEans?: Set<string>;
  loading?: boolean;
}

export default function ProductTable({
  products,
  page,
  onPageChange,
  onSelect,
  selectedEans,
  loading = false,
}: Props) {
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
                    {product.product_description}
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

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 px-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] rounded-lg font-medium
                     bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          Anterior
        </button>

        <span className="text-[13px] text-zinc-500 font-medium">
          P&aacute;gina {page}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={products.length < 30}
          className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] rounded-lg font-medium
                     bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Siguiente
          <ChevronRight size={14} />
        </button>
      </div>
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
      {sign}{value.toFixed(1)}%
    </span>
  );
}
