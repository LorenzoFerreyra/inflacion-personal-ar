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
            Clasificación
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            Cada producto se asigna a una clase COICOP del INDEC (por ejemplo,
            01.1.4 Leche, productos lácteos, huevos y alimentos vegetales) a
            partir de su nombre, con reglas revisadas a mano. Un producto que
            ninguna regla reconoce queda sin clasificar y no entra en los
            índices: no se asigna por la categoría del supermercado.
          </p>
        </section>

        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            Índice por clase
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            Para cada mes calendario se toma el precio de lista promedio de
            cada producto en cada cadena, sin los precios marcados como
            atípicos. En Disco, Jumbo y Vea parte del catálogo tiene precios
            inválidos, así que de esas cadenas entra solo el precio que
            coincide (entre la mitad y el doble) con el del mismo producto en
            otras cadenas. Cada producto se compara consigo mismo en la misma
            cadena entre un mes y el siguiente; las variaciones de más del
            doble o de menos de la mitad se descartan porque son errores de
            carga. Por
            clase se calcula la media geométrica de cada cadena (con al menos
            30 productos comparables) y todas las cadenas pesan igual. Los
            grupos y divisiones se arman con los ponderadores del INDEC para
            GBA, actualizados por precios al primer mes del índice.
          </p>
        </section>

        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            Comparación con el INDEC
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            Cada índice se compara con la serie del INDEC del mismo código,
            para la región GBA y los mismos meses; nunca contra el nivel
            general, que incluye alquileres, transporte y servicios. No se
            comparan las clases que el INDEC no publica por separado (como
            01.1.3 Pescados y 01.1.9 Otros alimentos). Algunas categorías del
            INDEC incluyen cosas que un supermercado no vende (el tabaco en
            02, el servicio doméstico en 05.6, la peluquería en 12.1): esas se
            comparan igual, con una nota que dice qué parte cubrimos, y la
            comparación vale como referencia. La canasta personal se
            compara con lo que habría marcado el INDEC para una canasta con la
            misma composición por clase.
          </p>
        </section>

        <section className="border-t border-hairline pt-4">
          <h3 className="text-[15px] font-medium text-zinc-50 mb-2">
            Variación por producto
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed prose-width">
            La variación de cada producto en Productos compara el precio
            más reciente con el del inicio del período (30, 90 o 365 días).
            Solo se calcula si ese inicio es posterior al 1 de julio de 2026:
            hasta junio, tres cadenas publicaban los precios en otra escala.
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
