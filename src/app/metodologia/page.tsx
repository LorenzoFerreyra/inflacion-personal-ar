import type { Metadata } from "next";
import { getChainList } from "@/lib/database";
import DataFlowDiagram from "@/components/DataFlowDiagram";

// Lee la base en cada request: no prerenderizar en build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Metodología del observatorio de inflación",
  description: "Metodología del cálculo de variación de precios",
};

export default async function MetodologiaPage() {
  const chainIds = await getChainList();
  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-[26px] font-semibold text-zinc-50 mb-8">
        Metodolog&iacute;a
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-12">
        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            Fuente de datos
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            Los precios se obtienen diariamente de las principales cadenas de
            supermercados de Argentina a través de sus portales públicos de
            precios, en cumplimiento con la regulación de transparencia de
            precios vigente.
          </p>
        </section>

        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            Cálculo de variación
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            La variación porcentual de cada producto se calcula comparando el
            precio más reciente contra el precio registrado al inicio del
            período seleccionado (30, 90 o 365 días).
          </p>
        </section>

        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            IPC de referencia
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            El Índice de Precios al Consumidor (IPC) utilizado como referencia
            es el publicado por el INDEC. Se emplea para contextualizar las
            variaciones individuales de cada producto respecto a la inflación
            general.
          </p>
        </section>

        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            Limitaciones
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            Este observatorio no pretende reemplazar las mediciones oficiales de
            inflación. Los datos reflejan únicamente precios de góndola en
            cadenas seleccionadas y no incluyen servicios, alquileres ni otros
            componentes del IPC.
          </p>
        </section>
      </div>

      <DataFlowDiagram chains={chainIds} />
    </div>
  );
}
