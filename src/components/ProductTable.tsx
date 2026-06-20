"use client";

import { Product } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/constants";
import { Package } from "@/components/Icons";
import ProductImage from "@/components/ProductImage";
import Pagination from "@/components/Pagination";
import VariationBadge from "@/components/VariationBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";

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
    return <LoadingSpinner message="Cargando productos..." />;
  }

  if (products.length === 0) {
    return (
      <EmptyState
        message="No se encontraron productos."
        icon={<Package size={32} strokeWidth={1.2} />}
      />
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
                      <span className="truncate">
                        {product.product_description}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 text-[13px]">
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

      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={onPageChange}
        label="productos"
      />
    </div>
  );
}
