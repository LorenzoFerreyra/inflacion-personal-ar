"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Search, TrendingUp } from "lucide-react";
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
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo + IPC badge */}
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-zinc-100">
              Observatorio de Inflaci&oacute;n
            </h1>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-full px-3 py-1">
              <span className="text-xs text-zinc-400">IPC</span>
              <span className="text-sm font-bold text-amber-400">
                {IPC[period]}%
              </span>
              <span className="text-xs text-zinc-500">
                {PERIODS[period].label.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Tabs + period toggle */}
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {tabs.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                      transition-colors duration-150
                      ${
                        isActive
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                      }
                    `}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Period toggle */}
            <div className="flex bg-zinc-900 border border-zinc-700 rounded-md overflow-hidden">
              {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === key
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
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
