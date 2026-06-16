"use client";

export default function MetodologiaPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-zinc-100">Metodología</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuente de datos */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
          <h3 className="text-[15px] font-semibold text-zinc-200 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-amber-400/60 flex-shrink-0" />
            Fuente de datos
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Los precios se obtienen diariamente de las principales cadenas de
            supermercados de Argentina a través de sus portales públicos de
            precios, en cumplimiento con la regulación de transparencia de
            precios vigente.
          </p>
        </div>

        {/* Cálculo de variación */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
          <h3 className="text-[15px] font-semibold text-zinc-200 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-amber-400/60 flex-shrink-0" />
            Cálculo de variación
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            La variación porcentual de cada producto se calcula comparando el
            precio más reciente contra el precio registrado al inicio del
            período seleccionado (7, 30, 90 o 365 días).
          </p>
        </div>

        {/* IPC de referencia */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
          <h3 className="text-[15px] font-semibold text-zinc-200 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-amber-400/60 flex-shrink-0" />
            IPC de referencia
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            El Índice de Precios al Consumidor (IPC) utilizado como referencia
            es el publicado por el INDEC. Se emplea para contextualizar las
            variaciones individuales de cada producto respecto a la inflación
            general.
          </p>
        </div>

        {/* Limitaciones */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 space-y-3">
          <h3 className="text-[15px] font-semibold text-zinc-200 flex items-center gap-2.5">
            <span className="w-0.5 h-4 rounded-full bg-zinc-500/80 flex-shrink-0" />
            Limitaciones
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Este observatorio no pretende reemplazar las mediciones oficiales de
            inflación. Los datos reflejan únicamente precios de góndola en
            cadenas seleccionadas y no incluyen servicios, alquileres ni otros
            componentes del IPC.
          </p>
        </div>
      </div>
    </div>
  );
}
