"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePeriod } from "@/lib/PeriodContext";
import { PERIODS, PeriodKey } from "@/lib/constants";
import { fmtMes } from "@/lib/canasta";
const tabs = [
  { href: "/", label: "Mi canasta" },
  { href: "/explorador", label: "Explorador" },
  { href: "/historial", label: "Historial" },
  { href: "/indices", label: "Índices" },
  { href: "/variedades", label: "Precios INDEC" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/sobre-mi", label: "Acerca de" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { period, setPeriod, ipc, ipcError, periodos } = usePeriod();
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
              className="font-display text-lg md:text-[22px] font-semibold text-zinc-50 whitespace-nowrap hover:text-amber-300"
            >
              Observatorio de inflaci&oacute;n
              <span className="text-amber-450">.</span>
            </Link>

            {/* IPC readout + period selector */}
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <span
                className="hidden sm:inline text-[11px] uppercase text-zinc-500"
                title="IPC nivel general, total nacional, último mes publicado por el INDEC. Es solo una referencia: las comparaciones se hacen por clase en Índices."
              >
                IPC nacional
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
                  <div className="absolute top-full right-0 mt-2 bg-panel-2 border border-hairline-strong rounded-sm shadow-xl py-1 min-w-[110px] z-50">
                    {(Object.keys(PERIODS) as PeriodKey[]).map((key) => {
                      const disponible = periodos?.disponibles[key] ?? true;
                      return (
                        <button
                          key={key}
                          disabled={!disponible}
                          title={
                            disponible || !periodos?.desde
                              ? undefined
                              : `Hay precios comparables desde ${fmtMes(periodos.desde)}`
                          }
                          onClick={() => {
                            setPeriod(key);
                            setPeriodOpen(false);
                          }}
                          className={`block w-full text-left px-3 py-1.5 text-[12px] ${
                            !disponible
                              ? "text-zinc-600 cursor-not-allowed"
                              : period === key
                                ? "text-amber-300 bg-amber-tint"
                                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          }`}
                        >
                          {PERIODS[key].label}
                          {!disponible && (
                            <span className="block text-[10px] text-zinc-600">sin datos aún</span>
                          )}
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
