"use client";

import { fmtMes, type ClaseCanasta, type ResultadoCanasta as Resultado } from "@/lib/canasta";
import { fmtPct } from "@/lib/format";
import VariationBadge from "@/components/VariationBadge";
import type { Product } from "@/lib/types";

interface Props {
  canasta: Resultado;
  basket: Product[];
}

const plural = (n: number) => `${n} producto${n === 1 ? "" : "s"}`;
const fmtPp = (v: number) => `${fmtPct(v).replace("%", "")} pp`;

/** Color de una diferencia contra el INDEC: más inflación que el INDEC = rojo. */
function tono(dif: number) {
  return dif > 0 ? "text-red-400" : dif < 0 ? "text-green-400" : "text-zinc-400";
}
function tonoBg(dif: number) {
  return dif > 0 ? "bg-red-400" : dif < 0 ? "bg-green-400" : "bg-zinc-500";
}

/** Escala lineal compartida que siempre incluye el cero. */
function escala(valores: number[]) {
  let lo = Math.min(0, ...valores);
  let hi = Math.max(0, ...valores);
  if (hi - lo < 1) hi = lo + 1;
  const pad = (hi - lo) * 0.08;
  if (lo < 0) lo -= pad;
  hi += pad;
  return (v: number) => ((v - lo) / (hi - lo)) * 100;
}

/**
 * Resultado de la canasta: tu inflación contra la del INDEC con la misma
 * composición, y el desglose por clase COICOP que explica la diferencia.
 */
export default function ResultadoCanasta({ canasta, basket }: Props) {
  const { comparacion, clases } = canasta;
  const nombres = new Map(basket.map((p) => [p.ean, p.product_description]));
  const meses = `${fmtMes(canasta.desde)} → ${fmtMes(canasta.hasta)}`;
  const fuera = canasta.productos.filter((p) => !p.comparable);

  return (
    <div className="space-y-10">
      {comparacion ? (
        <Resumen comparacion={comparacion} meses={meses} />
      ) : (
        <div>
          <p className="text-[13px] text-zinc-400">Tu canasta · {meses}</p>
          <p className="font-display text-5xl font-semibold tabular-nums text-zinc-50 mt-1">
            {canasta.canasta ? fmtPct(canasta.canasta.var_pct, false) : "—"}
          </p>
        </div>
      )}

      {canasta.motivo && (
        <p className="text-[13px] text-amber-300 bg-amber-tint border border-amber-tint-2 rounded-sm px-4 py-3">
          {canasta.motivo}
        </p>
      )}

      {clases.length > 0 && (
        <PorClase clases={clases} canasta={canasta} nombres={nombres} />
      )}

      {fuera.length > 0 && (
        <section>
          <h3 className="text-[15px] font-medium text-zinc-50">Fuera de la comparación</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-3">
            Cuentan para tu canasta completa
            {canasta.canasta && ` (${fmtPct(canasta.canasta.var_pct)} con ${plural(canasta.canasta.n)})`}
            , pero el INDEC no publica su clase o no hay precio en los dos meses.
          </p>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {fuera.map((p) => (
              <li key={p.ean} className="flex items-center justify-between gap-4 py-2 px-1 text-[13px]">
                <span className="text-zinc-300 truncate">{nombres.get(p.ean) ?? p.ean}</span>
                <span className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] text-zinc-500">
                    {p.var_pct === null
                      ? "sin precio en los dos meses"
                      : p.clase_coicop
                        ? `clase ${p.clase_coicop} sin serie INDEC`
                        : "sin clase COICOP"}
                  </span>
                  <VariationBadge value={p.var_pct} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="text-xs text-zinc-500 max-w-3xl group">
        <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200 w-fit">
          Cómo se calcula
        </summary>
        <p className="mt-2 leading-relaxed">
          Para cada producto se toma el precio promedio de cada mes en cada cadena y se compara
          consigo mismo en la misma cadena; todos los productos pesan igual. Del lado del INDEC
          se usa la variación de la clase COICOP de cada producto en GBA en los mismos meses: es
          lo que habría marcado el INDEC para una canasta con tu misma composición. Solo entran
          en la comparación los productos de clases que el INDEC publica por separado.
        </p>
      </details>
    </div>
  );
}

function Resumen({
  comparacion,
  meses,
}: {
  comparacion: NonNullable<Resultado["comparacion"]>;
  meses: string;
}) {
  const { canasta_var, indec_var, diferencia, n } = comparacion;
  const x = escala([canasta_var, indec_var]);
  const cero = x(0);
  const brecha = `${fmtPct(Math.abs(diferencia), false).replace("%", "")} pp`;
  const veredicto =
    diferencia > 0
      ? `${brecha} por encima del INDEC`
      : diferencia < 0
        ? `${brecha} por debajo del INDEC`
        : "igual que el INDEC";

  const barras = [
    { label: "Tu inflación", valor: canasta_var, color: "bg-amber-450", texto: "text-amber-300" },
    { label: "INDEC, mismas clases", valor: indec_var, color: "bg-zinc-500", texto: "text-zinc-300" },
  ];

  return (
    <section>
      <p className="text-[13px] text-zinc-500">
        {meses} · {plural(n)} comparables con el INDEC
      </p>
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-50 mt-2 leading-tight">
        Tu inflación fue{" "}
        <span className="text-amber-300 tabular-nums">{fmtPct(canasta_var, false)}</span>,{" "}
        <span className={tono(diferencia)}>{veredicto}</span>.
      </h2>

      <div className="mt-6 space-y-3 max-w-3xl">
        {barras.map((b) => {
          const desde = Math.min(cero, x(b.valor));
          const ancho = Math.abs(x(b.valor) - cero);
          return (
            <div key={b.label} className="grid grid-cols-[9rem_1fr] sm:grid-cols-[11rem_1fr] items-center gap-3">
              <span className="text-[13px] text-zinc-400">{b.label}</span>
              <div className="relative h-9 mr-12">
                <div
                  className="absolute top-0 bottom-0 w-px bg-hairline-strong"
                  style={{ left: `${cero}%` }}
                />
                <div
                  className={`absolute top-1 bottom-1 rounded-[2px] ${b.color}`}
                  style={{ left: `${desde}%`, width: `${Math.max(ancho, 0.5)}%` }}
                />
                <span
                  className={`absolute top-1/2 -translate-y-1/2 text-sm font-bold tabular-nums ${b.texto}`}
                  style={
                    b.valor >= 0
                      ? { left: `calc(${x(b.valor)}% + 8px)` }
                      : { right: `calc(${100 - x(b.valor)}% + 8px)` }
                  }
                >
                  {fmtPct(b.valor, false)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PorClase({
  clases,
  canasta,
  nombres,
}: {
  clases: ClaseCanasta[];
  canasta: Resultado;
  nombres: Map<string, string>;
}) {
  const x = escala(clases.flatMap((c) => [c.canasta_var, c.indec_var]));
  const cero = x(0);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 mb-1">
        <div>
          <h3 className="text-[15px] font-medium text-zinc-50">
            De dónde sale la diferencia
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Cada clase del INDEC de tu canasta: cuánto subió para vos y cuánto marcó el INDEC.
            Tocá una fila para ver los productos.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-450" /> Vos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-400" /> INDEC
          </span>
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-[minmax(0,16rem)_1fr_4.5rem] gap-4 px-1 pt-4 pb-2 border-b border-hairline-strong text-[11px] font-bold text-zinc-400 uppercase">
        <span>Clase</span>
        <span />
        <span className="text-right">Dif.</span>
      </div>

      <ul>
        {clases.map((c) => {
          const a = x(c.canasta_var);
          const b = x(c.indec_var);
          const productos = canasta.productos.filter(
            (p) => p.comparable && p.clase_coicop === c.codigo,
          );
          return (
            <li key={c.codigo} className="border-b border-hairline">
              <details className="group">
                <summary className="list-none cursor-pointer hover:bg-panel-2 px-1 py-3 grid grid-cols-[1fr_4.5rem] sm:grid-cols-[minmax(0,16rem)_1fr_4.5rem] gap-x-4 gap-y-2 items-center [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block text-[13px] text-zinc-200 truncate" title={c.nombre}>
                      <span className="inline-block text-zinc-500 group-open:rotate-90 transition-transform mr-1.5">›</span>
                      {c.nombre}
                    </span>
                    <span className="block text-[11px] text-zinc-500 tabular pl-3.5">
                      {c.codigo} · {plural(c.n)} ·{" "}
                      <span className="text-amber-300">{fmtPct(c.canasta_var)}</span> vs{" "}
                      {fmtPct(c.indec_var)}
                    </span>
                  </span>

                  <span className="relative h-6 mx-2 col-span-2 sm:col-span-1 row-start-2 sm:row-start-auto order-last sm:order-none">
                    <span className="absolute inset-y-0 w-px bg-hairline-strong" style={{ left: `${cero}%` }} />
                    <span
                      className={`absolute top-1/2 h-0.5 -translate-y-1/2 opacity-60 ${tonoBg(c.diferencia)}`}
                      style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%` }}
                    />
                    <span
                      className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-450"
                      style={{ left: `${a}%` }}
                      title={`Vos ${fmtPct(c.canasta_var)}`}
                    />
                    {/* Anillo más grande y hueco: se ve aunque coincida con tu punto. */}
                    <span
                      className="absolute top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-400"
                      style={{ left: `${b}%` }}
                      title={`INDEC ${fmtPct(c.indec_var)}`}
                    />
                  </span>

                  <span className={`text-right tabular text-[13px] font-bold ${tono(c.diferencia)}`}>
                    {fmtPp(c.diferencia)}
                  </span>
                </summary>

                <ul className="pb-3 pl-5 pr-1 space-y-1">
                  {productos.map((p) => (
                    <li key={p.ean} className="flex items-center justify-between gap-4 text-[12px]">
                      <span className="text-zinc-400 truncate">{nombres.get(p.ean) ?? p.ean}</span>
                      <VariationBadge value={p.var_pct} />
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
      <div className="hidden sm:grid grid-cols-[minmax(0,16rem)_1fr_4.5rem] gap-4 px-1 pt-1 text-[10px] text-zinc-600 tabular">
        <span />
        <span className="relative h-3 mx-2">
          <span className="absolute -translate-x-1/2" style={{ left: `${cero}%` }}>0%</span>
        </span>
        <span />
      </div>
    </section>
  );
}
