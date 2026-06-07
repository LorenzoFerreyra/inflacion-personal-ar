/**
 * ProductTable.tsx — Tabla paginada de productos con precios y variación.
 *
 * Reutilizable en Mi canasta y Explorador.
 * Props:
 *   - products: array de productos a mostrar
 *   - page: página actual
 *   - onPageChange: callback cuando cambia la página
 *   - onSelect: callback cuando se clickea una fila (devuelve el producto)
 *   - selectionMode: "single" o "multiple"
 *   - selectedEans: set de EANs actualmente seleccionados (para highlight)
 *   - loading: indica si está cargando datos
 */

"use client";

import { Product } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      <div className="flex items-center justify-center py-12 text-zinc-500">
        Cargando productos...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        No se encontraron productos.
      </div>
    );
  }

  return (
    <div>
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-left">
              <th className="py-3 px-2 font-medium">Producto</th>
              <th className="py-3 px-2 font-medium">Marca</th>
              <th className="py-3 px-2 font-medium">Categoría</th>
              <th className="py-3 px-2 font-medium text-right">Precio</th>
              <th className="py-3 px-2 font-medium text-right">Variación</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isSelected = selectedEans?.has(product.ean);

              return (
                <tr
                  key={product.ean}
                  onClick={() => onSelect?.(product)}
                  className={`
                    border-b border-zinc-800/50 transition-colors cursor-pointer
                    ${isSelected ? "bg-zinc-800/50" : "hover:bg-zinc-900"}
                  `}
                >
                  <td className="py-2.5 px-2 text-zinc-200">
                    {product.product_description}
                  </td>
                  <td className="py-2.5 px-2 text-zinc-400">
                    {product.marca}
                  </td>
                  <td className="py-2.5 px-2 text-zinc-400">
                    {product.categoria}
                  </td>
                  <td className="py-2.5 px-2 text-right text-zinc-200">
                    ${product.precio_actual?.toLocaleString("es-AR") ?? "—"}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <VariationBadge value={product.variacion_pct} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md
                     bg-zinc-800 text-zinc-300 hover:bg-zinc-700
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          Anterior
        </button>

        <span className="text-sm text-zinc-500">Página {page}</span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={products.length < 30}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md
                     bg-zinc-800 text-zinc-300 hover:bg-zinc-700
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Badge que muestra la variación con color semántico:
 *   - Verde: baja o cero
 *   - Rojo: suba
 */
function VariationBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span className="text-zinc-500">—</span>;
  }

  const isPositive = value > 0;
  const color = isPositive ? "text-red-400" : "text-green-400";
  const sign = isPositive ? "+" : "";

  return (
    <span className={`font-medium ${color}`}>
      {sign}{value.toFixed(1)}%
    </span>
  );
}
