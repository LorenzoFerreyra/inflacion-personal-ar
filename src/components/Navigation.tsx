"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePeriod } from "@/lib/PeriodContext";
import { PERIODS, PeriodKey } from "@/lib/constants";
const tabs = [
  { href: "/", label: "Mi canasta" },
  { href: "/explorador", label: "Explorador" },
  { href: "/historial", label: "Historial" },
  { href: "/insights", label: "Insights" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/sobre-mi", label: "Acerca de" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { period, setPeriod, ipc, ipcError } = usePeriod();
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
    <nav
      className="sticky top-0 z-50 border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl"
      aria-label="Navegación principal"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0 py-3 md:py-0 md:h-14">
          {/* Logo + IPC badge + period dropdown */}
          <div className="flex items-center gap-5">
            <Link
              href="/"
              aria-label="Ir a inicio"
              className="font-display text-xl font-semibold tracking-tight text-amber-300 hover:opacity-80"
            >
              Observatorio de inflaci&oacute;n
            </Link>
            <div className="flex items-center gap-2.5 bg-zinc-900/50 border border-zinc-800/40 rounded-full px-3.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                IPC
              </span>
              <span
                className={`text-sm font-semibold ${ipcError ? "text-zinc-500" : "text-amber-400/90"}`}
              >
                {ipcError ? "—" : `${ipc[period]}%`}
              </span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setPeriodOpen((v) => !v)}
                  aria-label="Cambiar período"
                  aria-haspopup="listbox"
                  aria-expanded={periodOpen}
                  className="text-[11px] text-zinc-400 font-medium hover:text-zinc-200 flex items-center gap-1
                             min-h-[44px] min-w-[44px] justify-center"
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
                  <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-xl py-1 min-w-[110px] z-50">
                    {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setPeriod(key);
                          setPeriodOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-[12px] font-medium ${
                          period === key
                            ? "text-amber-300 bg-amber-500/10"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                        }`}
                      >
                        {PERIODS[key].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-zinc-900/30 rounded-lg p-1 overflow-x-auto scroll-fade">
            {tabs.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    px-3.5 py-2 rounded-md text-[13px] font-medium whitespace-nowrap
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50
                    ${
                      isActive
                        ? "bg-zinc-800 text-zinc-50 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }
                  `}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
