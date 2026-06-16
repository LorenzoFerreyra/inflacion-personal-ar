"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePeriod } from "@/lib/PeriodContext";
import { PERIODS, PeriodKey } from "@/lib/constants";
const tabs = [
  { href: "/", label: "Mi canasta" },
  { href: "/explorador", label: "Explorador" },
  { href: "/insights", label: "Insights" },
  { href: "/cobertura", label: "Cobertura" },
  { href: "/metodologia", label: "Metodología" },
  { href: "/sobre-mi", label: "Acerca de" },
];

export default function Navigation() {
  const pathname = usePathname();
  const { period, setPeriod, ipc } = usePeriod();
  const [periodOpen, setPeriodOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setPeriodOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + IPC badge + period dropdown */}
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="font-display text-xl font-semibold tracking-tight text-gradient hover:opacity-80"
            >
              Observatorio de inflaci&oacute;n
            </Link>
            <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-700/50 rounded-full px-3.5 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 flex-shrink-0" />
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                IPC
              </span>
              <span className="text-sm font-bold text-amber-400">
                {ipc[period]}%
              </span>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setPeriodOpen((v) => !v)}
                  className="text-[11px] text-zinc-400 font-medium hover:text-zinc-200 flex items-center gap-1"
                >
                  {PERIODS[period].label.toLowerCase()}
                  <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-50">
                    <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  </svg>
                </button>
                {periodOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-xl py-1 min-w-[110px] z-50">
                    {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => { setPeriod(key); setPeriodOpen(false); }}
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
          <div className="flex bg-zinc-900/50 rounded-lg p-1">
            {tabs.map(({ href, label }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    px-3.5 py-1.5 rounded-md text-[13px] font-medium
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
