/**
 * Navigation.tsx — Tabs principales de la app.
 *
 * Tres secciones:
 *   - Mi canasta: armar una canasta personal y calcular inflación propia
 *   - Explorador: navegar productos y ver detalle individual
 *   - Insights: panorama general, alertas y ranking de cadenas
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Search, TrendingUp } from "lucide-react";

const tabs = [
  { href: "/", label: "Mi canasta", icon: ShoppingCart },
  { href: "/explorador", label: "Explorador", icon: Search },
  { href: "/insights", label: "Insights", icon: TrendingUp },
] as const;

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / título */}
          <h1 className="text-lg font-semibold text-zinc-100">
            Observatorio de Inflación
          </h1>

          {/* Tabs */}
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
        </div>
      </div>
    </nav>
  );
}
