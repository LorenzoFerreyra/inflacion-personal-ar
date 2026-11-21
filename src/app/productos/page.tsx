"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ExploradorView from "@/components/ExploradorView";
import CompararView from "@/components/CompararView";

/**
 * Productos: todo el relevamiento, producto por producto. Une lo que antes
 * eran Explorador (pestaña Detalle) e Historial (pestaña Comparar); las
 * rutas viejas redirigen acá (ver next.config.ts).
 */

type Vista = "detalle" | "comparar";

const PESTANAS: { vista: Vista; label: string; ayuda: string }[] = [
  {
    vista: "detalle",
    label: "Detalle",
    ayuda: "Elegí un producto para ver su historial y en qué cadena conviene comprarlo.",
  },
  {
    vista: "comparar",
    label: "Comparar",
    ayuda: "Tocá Comparar en hasta 4 productos para ver su evolución en un mismo gráfico.",
  },
];

function ProductosContenido() {
  const params = useSearchParams();
  const vista: Vista = params.get("vista") === "comparar" ? "comparar" : "detalle";
  const activa = PESTANAS.find((p) => p.vista === vista)!;

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-[26px] font-semibold text-zinc-50">Productos</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Todo el relevamiento, producto por producto. Para calcular tu inflación con varios
          productos, armá tu canasta en{" "}
          <Link
            href="/"
            className="text-amber-400 hover:text-amber-300 underline decoration-dotted underline-offset-4"
          >
            Mi canasta
          </Link>
          .
        </p>
      </header>

      <div role="tablist" aria-label="Vistas de productos" className="flex gap-6 border-b border-hairline mb-2">
        {PESTANAS.map((p) => {
          const seleccionada = p.vista === vista;
          return (
            <Link
              key={p.vista}
              role="tab"
              aria-selected={seleccionada}
              aria-controls="panel-productos"
              href={p.vista === "detalle" ? "/productos" : "/productos?vista=comparar"}
              replace
              scroll={false}
              className={`relative py-2.5 text-[14px] ${
                seleccionada ? "text-zinc-50 font-medium" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {p.label}
              {seleccionada && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-amber-450" />}
            </Link>
          );
        })}
      </div>
      <p className="text-[13px] text-zinc-500 mb-6">{activa.ayuda}</p>

      <div id="panel-productos" role="tabpanel">
        {vista === "detalle" ? <ExploradorView /> : <CompararView />}
      </div>
    </div>
  );
}

export default function ProductosPage() {
  return (
    <Suspense fallback={null}>
      <ProductosContenido />
    </Suspense>
  );
}
