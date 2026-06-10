"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Search, TrendingUp, Activity } from "lucide-react";
import { usePeriod } from "@/lib/PeriodContext";
import { IPC, PERIODS, PeriodKey } from "@/lib/constants";

const tabs = [
  { href: "/", label: "Mi canasta", icon: ShoppingCart },
  { href: "/explorador", label: "Explorador", icon: Search },
  { href: "/insights", label: "Insights", icon: TrendingUp },
] as const;

export default function Navigation() {
  const pathname = usePathname();
  const { period, setPeriod } = usePeriod();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo + IPC badge */}
          <div className="flex items-center gap-5">
            <Link href="/" className="text-lg font-bold tracking-tight text-gradient hover:opacity-80">
              Observatorio de Inflaci&oacute;n
            </Link>
            <div className="flex items-center gap-2.5 bg-zinc-900/80 border border-zinc-700/50 rounded-full px-3.5 py-1.5 shadow-sm">
              <Activity size={12} className="text-amber-400/70" />
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">IPC</span>
              <span className="text-sm font-bold text-amber-400">
                {IPC[period]}%
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                {PERIODS[period].label.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Tabs + period toggle */}
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-900/50 rounded-lg p-1">
              {tabs.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium
                      ${
                        isActive
                          ? "bg-zinc-800 text-zinc-50 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }
                    `}
                  >
                    <Icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="w-px h-6 bg-zinc-800" />

            {/* Period toggle */}
            <div className="flex bg-zinc-900/50 rounded-lg p-1">
              {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium ${
                    period === key
                      ? "bg-amber-500/15 text-amber-300 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {PERIODS[key].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
