import type { Metadata } from "next";

const CHAINS = [
  { id: "carrefour", name: "Carrefour", color: "#1a56db" },
  { id: "coto", name: "Coto", color: "#dc2626" },
  { id: "jumbo", name: "Jumbo", color: "#059669" },
  { id: "disco", name: "Disco", color: "#7c3aed" },
  { id: "vea", name: "Vea", color: "#d97706" },
  { id: "dia", name: "Día", color: "#e11d48" },
  { id: "chango_mas", name: "Chango Más", color: "#0891b2" },
  { id: "hiper_libertad", name: "Híper Libertad", color: "#4f46e5" },
  { id: "alvear", name: "Alvear", color: "#65a30d" },
  { id: "kilbel", name: "Kilbel", color: "#ca8a04" },
];

export default function CoberturaPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-gradient">
          Cobertura
        </h1>
        <p className="text-[14px] text-zinc-400 mt-2 max-w-2xl leading-relaxed">
          Relevamos precios diarios de {CHAINS.length} cadenas de supermercados
          en Argentina. Cada punto en el mapa representa una sucursal cuyo
          catálogo es monitoreado por nuestro sistema.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Map placeholder */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden min-h-[560px] flex items-center justify-center">
          {/* TODO: embed Leaflet / Mapbox map here */}
          <div className="text-center px-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/80 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 font-medium">
              Mapa de sucursales
            </p>
            <p className="text-[12px] text-zinc-600 mt-1">
              Aquí se integrará un mapa interactivo con la ubicación de todas las sucursales relevadas.
            </p>
          </div>
        </div>

        {/* Chain list sidebar */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Cadenas relevadas
          </h3>

          <ul className="space-y-2">
            {CHAINS.map((chain) => (
              <li
                key={chain.id}
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-3
                           hover:border-zinc-700/60"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chain.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-zinc-200 font-medium">
                    {chain.name}
                  </p>
                </div>
                <span className="text-[11px] text-zinc-600 font-medium">
                  {/* placeholder for branch count */}
                  —
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-zinc-800/40">
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Los datos se actualizan diariamente. La cobertura varía según
              la disponibilidad de catálogos públicos de cada cadena.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
