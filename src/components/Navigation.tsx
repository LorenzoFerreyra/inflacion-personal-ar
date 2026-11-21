"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePeriod } from "@/lib/PeriodContext";
import { PERIODS, PeriodKey } from "@/lib/constants";
const tabs = [
  { href: "/", label: "Mi canasta" },
  { href: "/productos", label: "Productos" },
  { href: "/indices", label: "Índices" },
  { href: "/variedades", label: "Precios INDEC" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/sobre-mi", label: "Acerca de" },
];

/** Evento que avisa a la página de la canasta que vuelva al paso 1. */
export const EVENTO_INICIO_CANASTA = "canasta:inicio";

/**
 * Un Link a la página en la que ya se está no hace nada visible (Next conserva
 * el estado y el scroll). En "/" eso deja al usuario varado en el resultado,
 * así que en ese caso se vuelve al inicio del armado y arriba de todo.
 */
function volverAlInicioSiMismaPagina(
  e: React.MouseEvent<HTMLAnchorElement>,
  href: string,
  pathname: string,
) {
  if (href !== pathname) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  if (href === "/") window.dispatchEvent(new Event(EVENTO_INICIO_CANASTA));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export default function Navigation() {
  const pathname = usePathname();
  // El IPC del header es solo una referencia: su selector no toca el período
  // global con el que se calculan la canasta y las tablas.
  const { ipc, ipcError } = usePeriod();
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [periodOpen, setPeriodOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setPeriodOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-zinc-950">
      <nav aria-label="Navegación principal">
        <div className="max-w-7xl mx-auto px-6">
          {/* Masthead */}
          <div className="flex items-baseline justify-between gap-4 pt-4 pb-2.5 border-b border-hairline">
            <Link
              href="/"
              aria-label="Ir a inicio"
              onClick={(e) => volverAlInicioSiMismaPagina(e, "/", pathname)}
              className="font-display text-lg md:text-[22px] font-semibold text-zinc-50 whitespace-nowrap hover:text-amber-300"
            >
              Observatorio de inflaci&oacute;n
              <span className="text-amber-450">.</span>
            </Link>

            {/* IPC readout + period selector */}
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span
                className="text-[11px] uppercase text-zinc-500"
                title="IPC del INDEC: nivel general, total nacional, último mes publicado. Es solo una referencia: las comparaciones se hacen por clase en Índices."
              >
                <span className="hidden sm:inline">IPC </span>INDEC
              </span>
              <span
                className={`tabular text-sm font-bold ${ipcError ? "text-zinc-500" : "text-amber-400"}`}
              >
                {ipcError ? "—" : `${ipc[period]}%`}
              </span>
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  onClick={() => setPeriodOpen((v) => !v)}
                  aria-label="Cambiar período"
                  aria-haspopup="listbox"
                  aria-expanded={periodOpen}
                  className="text-[12px] text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1
                             underline decoration-dotted decoration-zinc-600 underline-offset-4"
                >
                  {PERIODS[period].label.toLowerCase()}
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 8 8"
                    className="opacity-50"
                  >
                    <path
                      d="M1.5 3L4 5.5L6.5 3"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {periodOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-panel-2 border border-hairline-strong rounded-sm shadow-xl py-1 min-w-[150px] z-50">
                    <span className="block px-3 pt-1 pb-1.5 text-[10px] uppercase text-zinc-500">
                      IPC INDEC
                    </span>
                    {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setPeriod(key);
                            setPeriodOpen(false);
                          }}
                          className={`block w-full text-left px-3 py-1.5 text-[12px] ${
                            period === key
                              ? "text-amber-300 bg-amber-tint"
                              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-3">
                            {PERIODS[key].label}
                            {!ipcError && (
                              <span className="tabular text-[11px] text-zinc-500">{ipc[key]}%</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex overflow-x-auto scrollbar-hide -mx-1">
            {tabs.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={(e) => volverAlInicioSiMismaPagina(e, href, pathname)}
                  className={`relative px-3 py-2.5 text-[13px] whitespace-nowrap ${
                    isActive
                      ? "text-zinc-50 font-medium"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-[2px] bg-amber-450" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Newspaper double rule */}
        <div className="h-[3px] border-y border-hairline" aria-hidden="true" />
      </nav>
    </header>
  );
}
