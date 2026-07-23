"use client";

import { Product } from "@/lib/types";
import { PAGE_SIZE } from "@/lib/constants";
import { Package, Check } from "@/components/Icons";
import ProductImage from "@/components/ProductImage";
import Pagination from "@/components/Pagination";
import VariationBadge from "@/components/VariationBadge";
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
  chainFiltered?: boolean;
}

const HEADER_CELL =
  "py-2.5 px-3 text-[11px] font-bold text-zinc-400 uppercase";

function SkeletonRows() {
  return (
    <div aria-live="polite">
      <span className="sr-only">Cargando productos...</span>
      <div className="border-y border-hairline divide-y divide-hairline">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 px-3">
            <div className="skeleton w-7 h-7 shrink-0" />
            <div className="skeleton h-3 flex-1 max-w-72" />
            <div className="skeleton h-3 w-20 hidden sm:block" />
            <div className="skeleton h-3 w-14 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
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
  chainFiltered = false,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (loading) {
    return <SkeletonRows />;
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[15%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-hairline-strong">
              <th className={`${HEADER_CELL} text-left`}>Producto</th>
              <th className={`${HEADER_CELL} text-left`}>Marca</th>
              <th className={`${HEADER_CELL} text-left`}>Categor&iacute;a</th>
              <th className={`${HEADER_CELL} text-right`}>
                {chainFiltered ? "Precio" : "Precio prom."}
              </th>
              <th className={`${HEADER_CELL} text-right`}>Variaci&oacute;n</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isSelected = selectedEans?.has(product.ean);

              return (
                <tr
                  key={product.ean}
                  onClick={() => onSelect?.(product)}
                  aria-selected={isSelected}
                  className={`
                    border-b border-hairline cursor-pointer
                    ${isSelected ? "bg-amber-tint" : "hover:bg-panel-2"}
                  `}
                >
                  <td className="py-2.5 px-3 text-zinc-200 font-medium">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isSelected && (
                        <Check
                          size={13}
                          strokeWidth={2.5}
                          className="text-amber-400 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <ProductImage
                        src={product.image_url}
                        alt={product.product_description}
                        marca={product.marca}
                      />
                      <span
                        className="truncate min-w-0"
                        title={product.product_description}
                      >
                        {product.product_description}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 text-[13px] truncate">
                    {product.marca}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-500 text-[12px] truncate">
                    {product.categoria}
                  </td>
                  <td className="py-2.5 px-3 text-right text-zinc-200 tabular text-[13px]">
                    <span>
                      ${product.precio_actual?.toLocaleString("es-AR") ?? "—"}
                    </span>
                    {!chainFiltered && product.cobertura_cadenas > 0 && (
                      <span className="ml-1 text-[9px] font-sans text-zinc-600 font-normal">
                        {product.cobertura_cadenas}c
                      </span>
                    )}
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
