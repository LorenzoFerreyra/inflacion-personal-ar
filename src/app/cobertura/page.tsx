import type { Metadata } from "next";
import { getBranches, getChainList } from "@/lib/database";
import { chainColor, chainLabel } from "@/lib/chainColors";
import BranchMapLoader from "@/components/BranchMapLoader";

// Lee la base en cada request: no prerenderizar en build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cobertura del observatorio de inflación",
  description: "Cadenas de supermercados relevadas",
};

// INDEC es la fuente oficial de referencia, no una cadena con sucursales.
const NON_STORE_CHAINS = new Set(["indec"]);

// La tabla de sucursales trae "super_top" y "supertop" para la misma cadena.
const CHAIN_ALIASES: Record<string, string> = { super_top: "supertop" };

export default async function CoberturaPage() {
  const allBranches = (await getBranches()).map((b) => ({
    ...b,
    cadena: CHAIN_ALIASES[b.cadena] ?? b.cadena,
  }));
  const mappableBranches = allBranches.filter(
    (b) => b.latitud != null && b.longitud != null,
  ) as (typeof allBranches[number] & { latitud: number; longitud: number })[];
  const chainIds = (await getChainList()).filter(
    (id) => !NON_STORE_CHAINS.has(id),
  );

  const chains = chainIds.map((id) => ({
    id,
    name: chainLabel(id),
    color: chainColor(id),
  }));

  const countByChain: Record<string, number> = {};
  for (const b of allBranches) {
    countByChain[b.cadena] = (countByChain[b.cadena] ?? 0) + 1;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-[26px] font-semibold text-zinc-50">
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
        <div className="rounded-sm border border-hairline overflow-hidden min-h-140">
          <BranchMapLoader branches={mappableBranches} chains={chains} />
        </div>

        {/* Chain list sidebar */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase border-b border-hairline-strong pb-2">
            Cadenas relevadas
          </h3>

          <ul className="divide-y divide-hairline">
            {chains.map((chain) => (
              <li
                key={chain.id}
                className="flex items-center gap-3 py-2.5"
              >
                <span
                  className="w-2.5 h-2.5 shrink-0"
                  style={{
                    backgroundColor: chain.color,
                    borderRadius: "2px",
                    transform: "rotate(45deg)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-zinc-200 font-medium">
                    {chain.name}
                  </p>
                </div>
                <span
                  className="text-[12px] text-zinc-400 tabular"
                  title={
                    countByChain[chain.id]
                      ? undefined
                      : "Sin sucursales cargadas todavía"
                  }
                >
                  {countByChain[chain.id] ?? "—"}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-3 border-t border-hairline-strong">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-zinc-500">
                Total sucursales
              </span>
              <span className="text-[11px] text-zinc-400 tabular font-semibold">
                {allBranches.length}
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
