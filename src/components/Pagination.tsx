"use client";

import { ChevronLeft, ChevronRight } from "@/components/Icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export default function Pagination({
  page,
  totalPages,
  totalCount,
  onPageChange,
  label = "productos",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const nearby: number[] = [];
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) {
    nearby.push(i);
  }

  const showFirst = nearby[0] > 1;
  const showLast = nearby[nearby.length - 1] < totalPages;
  const gapAfterFirst = nearby[0] > 2;
  const gapBeforeLast = nearby[nearby.length - 1] < totalPages - 1;

  const pgBtn = (n: number, btnLabel?: string) => (
    <button
      key={n}
      onClick={() => onPageChange(n)}
      className={`h-8 rounded-md text-[13px] font-medium
        ${btnLabel ? "px-3" : "w-8 tabular-nums"}
        ${
          n === page
            ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
        }`}
    >
      {btnLabel ?? n}
    </button>
  );

  return (
    <div className="flex items-center justify-between mt-5 px-1">
      <span className="text-[12px] text-zinc-500 tabular-nums font-medium min-w-[120px]">
        {totalCount.toLocaleString("es-AR")} {label}
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
