import type { Metadata } from "next";
import { getBranches, getChainList } from "@/lib/database";
import { chainColor, chainLabel } from "@/lib/chainColors";
import BranchMapLoader from "@/components/BranchMapLoader";

export const metadata: Metadata = {
  title: "Cobertura del observatorio de inflación",
  description: "Cadenas de supermercados relevadas",
};

export default function CoberturaPage() {
  const branches = getBranches();
  const chainIds = getChainList();

  const chains = chainIds.map((id) => ({
    id,
    name: chainLabel(id),
    color: chainColor(id),
  }));

  const countByChain: Record<string, number> = {};
  for (const b of branches) {
    countByChain[b.cadena] = (countByChain[b.cadena] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold text-gradient">
          Cobertura
        </h1>
        <p className="text-[14px] text-zinc-400 mt-2 max-w-2xl leading-relaxed">
          Relevamos precios diarios de {chains.length} cadenas de supermercados
          en Argentina. Cada punto en el mapa representa una sucursal cuyo
          catálogo es monitoreado por nuestro sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Map */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden min-h-140">
          <BranchMapLoader branches={branches} chains={chains} />
        </div>

        {/* Chain list sidebar */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Cadenas relevadas
          </h3>

          <ul className="space-y-2">
            {chains.map((chain) => (
              <li
                key={chain.id}
                className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-3
                           hover:border-zinc-700/60"
              >
                <span
                  className="w-2.5 h-2.5 shrink-0"
                  style={{
                    backgroundColor: chain.color,
                    borderRadius: "2px",
                    transform: "rotate(45deg)",
                    boxShadow: `0 0 4px ${chain.color}80`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-zinc-200 font-medium">
                    {chain.name}
                  </p>
                </div>
                <span className="text-[11px] text-zinc-500 tabular font-medium">
                  {countByChain[chain.id] ?? 0}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-zinc-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-zinc-500">
                Total sucursales
              </span>
              <span className="text-[11px] text-zinc-400 tabular font-semibold">
                {branches.length}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Los datos se actualizan diariamente. La cobertura varía según la
              disponibilidad de catálogos públicos de cada cadena.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
