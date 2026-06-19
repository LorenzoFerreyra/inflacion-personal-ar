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
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg
          width="24"
          height="24"
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
      </div>
      <h2 className="text-lg font-semibold text-zinc-200">Algo salió mal</h2>
      <p className="text-sm text-zinc-400 max-w-md">
        Ocurrió un error inesperado. Por favor intentá de nuevo.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-700/50
                   text-zinc-300 hover:bg-zinc-800/60 text-sm font-medium"
      >
        Reintentar
      </button>
    </div>
  );
}
