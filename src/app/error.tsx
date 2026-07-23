"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-red-400"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2 className="text-lg font-medium text-zinc-50">Algo salió mal</h2>
      <p className="text-sm text-zinc-400 max-w-md">
        Ocurrió un error inesperado. Por favor intentá de nuevo.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-sm border border-hairline-strong
                   text-zinc-300 hover:bg-panel-2 text-sm font-medium"
      >
        Reintentar
      </button>
    </div>
  );
}
