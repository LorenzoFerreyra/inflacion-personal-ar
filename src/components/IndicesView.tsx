"use client";

import { useEffect, useMemo, useState } from "react";
import ComparacionClases, { motivoSinComparacion } from "@/components/ComparacionClases";
import IndexChart from "@/components/IndexChart";
import LoadingSpinner from "@/components/LoadingSpinner";
import { fmtMes } from "@/lib/canasta";
import { fmtPct } from "@/lib/format";
import {
  diferenciaPp,
  mesDeComparacion,
  type ComparacionIndices,
  type PuntoComparado,
  type SerieComparada,
} from "@/lib/indices";

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-10-01" → "octubre de 2026" */
function fmtMesLargo(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  return `${MESES_LARGOS[m - 1]} de ${y}`;
}

/** "De julio a octubre de 2026" o "De julio de 2026 a enero de 2027". */
function fmtRango(desde: string, hasta: string): string {
  const [yd, md] = desde.split("-").map(Number);
  const [yh, mh] = hasta.split("-").map(Number);
  return yd === yh
    ? `De ${MESES_LARGOS[md - 1]} a ${MESES_LARGOS[mh - 1]} de ${yh}`
    : `De ${fmtMesLargo(desde)} a ${fmtMesLargo(hasta)}`;
}

function nombreRegion(region: string): string {
  return region === "GBA" ? "Gran Buenos Aires" : region;
}

/** 1,4 → "1,4%" sin signo, para usar dentro de una frase ("subieron 1,4%"). */
function pctFrase(v: number): string {
  return fmtPct(Math.abs(v), false);
}

/** Variación acumulada desde el mes base, a partir del índice base 100. */
function acumulado(indice: number | null): number | null {
  return indice === null ? null : indice - 100;
}

/** Último punto con variación propia (el mes más reciente que medimos). */
function ultimoPunto(s: SerieComparada): PuntoComparado | null {
  for (let i = s.puntos.length - 1; i >= 0; i--) {
    if (s.puntos[i].propio_var !== null) return s.puntos[i];
  }
  return null;
}

/** Último punto con índice propio y del INDEC, para comparar el acumulado. */
function ultimoPuntoConIndec(s: SerieComparada): PuntoComparado | null {
  for (let i = s.puntos.length - 1; i >= 0; i--) {
    if (s.puntos[i].indec !== null) return s.puntos[i];
  }
  return null;
}

function division(codigo: string): string {
  return codigo.split(".")[0];
}

/** Diferencia contada en palabras: "0,5 puntos menos" ("0,5 pts menos" si corto). */
function difEnPalabras(dif: number, corto = false): string {
  if (dif === 0) return "igual";
  const pts = Math.abs(dif).toFixed(1).replace(".", ",");
  const unidad = corto ? "pts" : pts === "1,0" ? "punto" : "puntos";
  return `${pts} ${unidad} ${dif > 0 ? "más" : "menos"}`;
}

function colorDif(dif: number): string {
  return dif > 0 ? "text-red-400" : dif < 0 ? "text-green-400" : "text-zinc-400";
}

export default function IndicesView() {
  const [data, setData] = useState<ComparacionIndices | null>(null);
  const [error, setError] = useState(false);
  // /indices#01.1.4 abre esa serie. Los datos se piden en el cliente, así que
  // el primer render (spinner) es igual en el servidor y no hay desajuste.
  const [codigo, setCodigoState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : decodeURIComponent(window.location.hash.slice(1)) || null,
  );
  function setCodigo(c: string) {
    setCodigoState(c);
    window.history.replaceState(null, "", `#${c}`);
  }

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/indices", { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: ComparacionIndices) => setData(d))
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => abort.abort();
  }, []);

  const seleccionada = useMemo(() => {
    if (!data || data.series.length === 0) return null;
    return (
      data.series.find((s) => s.codigo === codigo) ??
      data.series.find((s) => s.codigo === "01") ??
      data.series.find((s) => s.comparable) ??
      data.series[0]
    );
  }, [data, codigo]);

  if (error) {
    return <p className="text-sm text-red-400 py-16 text-center">Error al cargar los índices.</p>;
  }
  if (!data) return <LoadingSpinner message="Cargando índices..." />;
  if (data.series.length === 0 || !seleccionada) {
    return <p className="text-sm text-zinc-400 py-16 text-center">{motivoSinComparacion(data)}</p>;
  }

  const sinIndec = mesDeComparacion(data) === null;
  const divisiones = data.series.filter((s) => s.nivel === "Division");
  const divSel = division(seleccionada.codigo);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[26px] font-semibold text-zinc-50">
          ¿Cuánto suben los precios en el súper?
        </h1>
        <p className="text-[15px] text-zinc-400 mt-2 max-w-3xl leading-relaxed">
          Medimos mes a mes cuánto cambian los precios en supermercados y los comparamos con lo que
          mide el INDEC para la misma categoría en el {nombreRegion(data.region)}. Elegí una
          categoría para ver el detalle.
        </p>
        {sinIndec && (
          <p className="mt-4 text-[13px] text-amber-300 bg-amber-tint border border-amber-tint-2 rounded-sm px-4 py-3 max-w-3xl">
            {motivoSinComparacion(data)}
          </p>
        )}
      </div>

      <section aria-label="Categorías" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
          {divisiones.map((s) => (
            <TarjetaCategoria
              key={s.codigo}
              serie={s}
              activa={division(s.codigo) === divSel}
              onClick={() => setCodigo(s.codigo)}
            />
          ))}
        </div>

        <Subcategorias
          data={data}
          divisionCodigo={divSel}
          seleccionada={seleccionada.codigo}
          onSelect={setCodigo}
        />
      </section>

      <section
        aria-label={`Detalle de ${seleccionada.nombre}`}
        className="border border-hairline rounded-md bg-panel p-4 sm:p-6 space-y-6"
      >
        <Resumen serie={seleccionada} region={data.region} />

        <div>
          <h3 className="text-[13px] font-medium text-zinc-300 mb-2">Cómo vienen subiendo los precios</h3>
          <IndexChart serie={seleccionada} region={data.region} />
        </div>

        <MesAMes serie={seleccionada} />

        <details className="group border-t border-hairline pt-4">
          <summary className="cursor-pointer text-[13px] text-zinc-400 hover:text-zinc-200 select-none list-none flex items-center gap-2">
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Datos técnicos (índice base 100, muestra, código COICOP)
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-[12px] text-zinc-500 leading-relaxed max-w-3xl">
              Índice de precios de supermercados para la apertura COICOP {seleccionada.codigo} del
              INDEC, con base {fmtMes(data.base!)} = 100, al lado de la serie del INDEC con el mismo
              código para la región {data.region}. Se comparan los mismos meses y las mismas
              aperturas: nunca un rubro contra el nivel general.
            </p>
            <DetalleTecnico serie={seleccionada} />
          </div>
        </details>
      </section>

      <details className="group border-t border-hairline pt-5 max-w-3xl">
        <summary className="cursor-pointer text-[15px] font-medium text-zinc-200 hover:text-zinc-50 select-none list-none flex items-center gap-2">
          <span className="inline-block transition-transform group-open:rotate-90">›</span>
          Ver todas las categorías en una tabla
        </summary>
        <div className="mt-3">
          <ComparacionClases data={data} onSelect={setCodigo} />
        </div>
      </details>
    </div>
  );
}

/** Variación del último mes, como etiqueta corta para tarjetas y botones. */
function VariacionCorta({ serie }: { serie: SerieComparada }) {
  const p = ultimoPunto(serie);
  return <span className="tabular">{p ? fmtPct(p.propio_var!) : "—"}</span>;
}

function TarjetaCategoria({
  serie,
  activa,
  onClick,
}: {
  serie: SerieComparada;
  activa: boolean;
  onClick: () => void;
}) {
  const p = ultimoPunto(serie);
  return (
    <button
      onClick={onClick}
      aria-pressed={activa}
      className={`group text-left rounded-md border p-3 sm:p-3.5 flex flex-col gap-1.5 sm:gap-2 min-h-[92px] sm:min-h-[112px] transition-colors cursor-pointer ${
        activa
          ? "border-amber-450 bg-amber-tint"
          : "border-hairline-strong bg-panel hover:border-zinc-500 hover:bg-panel-2"
      }`}
    >
      <span
        className={`text-[13px] leading-snug line-clamp-2 ${activa ? "text-amber-300" : "text-zinc-200"}`}
      >
        {serie.nombre}
      </span>
      <span className="mt-auto flex items-end justify-between gap-2">
        <span>
          <span className={`block text-[18px] sm:text-[20px] font-semibold tabular ${activa ? "text-amber-300" : "text-zinc-50"}`}>
            {p ? fmtPct(p.propio_var!) : "—"}
          </span>
          <span className="block text-[11px] text-zinc-500">
            {p ? `en ${fmtMes(p.periodo).split(" ")[0]}` : "sin datos"}
            {p && p.indec_var !== null && ` · INDEC ${fmtPct(p.indec_var)}`}
          </span>
        </span>
        <span
          aria-hidden
          className={`text-lg leading-none ${activa ? "text-amber-300" : "text-zinc-600 group-hover:text-zinc-300"}`}
        >
          ›
        </span>
      </span>
    </button>
  );
}

function Pill({
  serie,
  activa,
  fuerte,
  etiqueta,
  onClick,
}: {
  serie: SerieComparada;
  activa: boolean;
  fuerte?: boolean;
  etiqueta?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activa}
      className={`inline-flex items-center gap-2 text-left rounded-full border px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
        activa
          ? "border-amber-450 bg-amber-tint text-amber-300"
          : fuerte
            ? "border-hairline-strong bg-panel-2 text-zinc-100 hover:border-zinc-500"
            : "border-hairline-strong text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
      }`}
    >
      <span>{etiqueta ?? serie.nombre}</span>
      <span className={`text-[12px] ${activa ? "text-amber-300" : "text-zinc-500"}`}>
        <VariacionCorta serie={serie} />
      </span>
    </button>
  );
}

/** Grupos y clases dentro de la división elegida, como botones. */
function Subcategorias({
  data,
  divisionCodigo,
  seleccionada,
  onSelect,
}: {
  data: ComparacionIndices;
  divisionCodigo: string;
  seleccionada: string;
  onSelect: (codigo: string) => void;
}) {
  const grupos = data.series.filter(
    (s) => s.nivel === "Grupo" && division(s.codigo) === divisionCodigo,
  );
  const filas = grupos
    .map((g) => ({
      grupo: g,
      clases: data.series.filter((s) => s.nivel === "Clase" && s.codigo.startsWith(`${g.codigo}.`)),
    }))
    .filter(({ grupo, clases }) => clases.length > 0 || grupos.length > 1 || grupo.comparable);
  if (filas.length === 0) return null;

  const conVar = (s: SerieComparada, nombre = s.nombre) => {
    const p = ultimoPunto(s);
    return p ? `${nombre} (${fmtPct(p.propio_var!)})` : nombre;
  };
  const enEstaDivision = division(seleccionada) === divisionCodigo;

  return (
    <>
      {/* En el celular, un desplegable: la lista de botones ocuparía varias pantallas. */}
      <label className="block sm:hidden">
        <span className="block text-[12px] text-zinc-500 mb-1.5">Ver un rubro más específico:</span>
        <select
          value={enEstaDivision ? seleccionada : divisionCodigo}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full rounded-md border border-hairline-strong bg-panel-2 text-zinc-100 text-[14px] px-3 py-2.5"
        >
          <option value={divisionCodigo}>Toda la categoría</option>
          {filas.map(({ grupo, clases }) =>
            clases.length === 0 ? (
              <option key={grupo.codigo} value={grupo.codigo}>{conVar(grupo)}</option>
            ) : (
              <optgroup key={grupo.codigo} label={grupo.nombre}>
                <option value={grupo.codigo}>{conVar(grupo, `Todo ${grupo.nombre.toLowerCase()}`)}</option>
                {clases.map((c) => (
                  <option key={c.codigo} value={c.codigo}>{conVar(c)}</option>
                ))}
              </optgroup>
            ),
          )}
        </select>
      </label>

      <div className="hidden sm:block border border-hairline rounded-md p-4 space-y-3">
      <p className="text-[12px] text-zinc-500">Ver un rubro más específico:</p>
      {filas.map(({ grupo, clases }) => (
        <div key={grupo.codigo} className="flex flex-wrap gap-2">
          <Pill
            serie={grupo}
            fuerte
            etiqueta={clases.length > 0 ? `Todo ${grupo.nombre.toLowerCase()}` : undefined}
            activa={grupo.codigo === seleccionada}
            onClick={() => onSelect(grupo.codigo)}
          />
          {clases.map((c) => (
            <Pill
              key={c.codigo}
              serie={c}
              activa={c.codigo === seleccionada}
              onClick={() => onSelect(c.codigo)}
            />
          ))}
        </div>
      ))}
      </div>
    </>
  );
}

/** Lo principal en palabras y dos cifras: el último mes y lo acumulado. */
function Resumen({ serie, region }: { serie: SerieComparada; region: string }) {
  const p = ultimoPunto(serie);
  const base = serie.puntos[0]?.periodo;
  const acum = ultimoPuntoConIndec(serie) ?? serie.puntos.at(-1) ?? null;

  if (!p) {
    return (
      <div>
        <h2 className="text-xl font-medium text-zinc-50">{serie.nombre}</h2>
        <p className="text-[14px] text-zinc-400 mt-2">Todavía no hay dos meses para comparar.</p>
      </div>
    );
  }

  const v = p.propio_var!;
  const verbo = v > 0 ? "subieron" : v < 0 ? "bajaron" : "no cambiaron";
  const iv = p.indec_var;
  const dif = iv !== null ? diferenciaPp(v, iv) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-medium text-zinc-50">{serie.nombre}</h2>
        <p className="text-[15px] text-zinc-300 mt-2 leading-relaxed max-w-3xl">
          En {fmtMesLargo(p.periodo)}, los precios en supermercados{" "}
          <strong className="text-zinc-50">
            {verbo}
            {v !== 0 && ` ${pctFrase(v)}`}
          </strong>
          .{" "}
          {iv !== null && dif !== null ? (
            <>
              Para la misma categoría, el INDEC midió{" "}
              {iv === 0 ? "precios estables" : `una ${iv > 0 ? "suba" : "baja"} de ${pctFrase(iv)}`} en
              el {nombreRegion(region)}:{" "}
              {dif === 0 ? (
                "lo mismo que en el súper."
              ) : (
                <>
                  en el súper subieron{" "}
                  <strong className={colorDif(dif)}>{difEnPalabras(dif)}</strong>.
                </>
              )}
            </>
          ) : serie.comparable ? (
            <>El INDEC todavía no publicó {fmtMesLargo(p.periodo)}.</>
          ) : null}
        </p>
        {!serie.comparable && serie.motivo && (
          <p className="text-[13px] text-zinc-500 mt-2 leading-relaxed max-w-3xl">
            Sin comparación con el INDEC. {serie.motivo}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        <Cifra
          titulo={`En ${fmtMesLargo(p.periodo)}`}
          propio={v}
          indec={iv}
        />
        {base && acum && (
          <Cifra
            titulo={`${fmtRango(base, acum.periodo)}, acumulado`}
            propio={acumulado(acum.propio)!}
            indec={acumulado(acum.indec)}
          />
        )}
      </div>
    </div>
  );
}

function Cifra({ titulo, propio, indec }: { titulo: string; propio: number; indec: number | null }) {
  return (
    <div className="rounded-md border border-hairline bg-panel-2 px-4 py-3">
      <p className="text-[12px] text-zinc-500">{titulo}</p>
      <div className="flex items-baseline gap-5 mt-1">
        <div>
          <p className="text-[24px] font-semibold tabular text-amber-300">{fmtPct(propio)}</p>
          <p className="text-[11px] text-zinc-500">Supermercados</p>
        </div>
        {indec !== null && (
          <div>
            <p className="text-[24px] font-semibold tabular text-violet-300">{fmtPct(indec)}</p>
            <p className="text-[11px] text-zinc-500">INDEC</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tabla simple: cuánto subió cada mes en el súper y según el INDEC. */
function MesAMes({ serie }: { serie: SerieComparada }) {
  const filas = serie.puntos.filter((p) => p.propio_var !== null);
  if (filas.length === 0) return null;
  const hayIndec = filas.some((p) => p.indec_var !== null);
  return (
    <div className="overflow-x-auto">
      <h3 className="text-[13px] font-medium text-zinc-300 mb-2">Mes a mes</h3>
      <table className="w-full text-sm max-w-2xl">
        <thead>
          <tr className="border-b border-hairline-strong text-[12px] text-zinc-400">
            <th className="py-2 px-2 text-left font-medium">Mes</th>
            <th className="py-2 px-2 text-right font-medium">
              <span className="sm:hidden">Súper</span>
              <span className="hidden sm:inline">En el súper</span>
            </th>
            {hayIndec && (
              <>
                <th className="py-2 px-2 text-right font-medium">INDEC</th>
                <th className="py-2 px-2 text-right font-medium">
                  <span className="sm:hidden">Súper vs. INDEC</span>
                  <span className="hidden sm:inline">El súper subió…</span>
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {filas.map((p) => {
            const dif =
              p.indec_var !== null ? diferenciaPp(p.propio_var!, p.indec_var) : null;
            return (
              <tr key={p.periodo} className="border-b border-hairline">
                <td className="py-2 px-2 text-[13px] text-zinc-300 whitespace-nowrap">{fmtMes(p.periodo)}</td>
                <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-100">
                  {fmtPct(p.propio_var!)}
                </td>
                {hayIndec && (
                  <>
                    <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-400">
                      {p.indec_var === null ? "sin publicar" : fmtPct(p.indec_var)}
                    </td>
                    <td className={`py-2 px-2 text-right text-[13px] ${dif === null ? "text-zinc-600" : colorDif(dif)}`}>
                      {dif === null ? (
                        "—"
                      ) : dif === 0 ? (
                        "igual"
                      ) : (
                        <>
                          <span className="sm:hidden whitespace-nowrap">{difEnPalabras(dif, true)}</span>
                          <span className="hidden sm:inline">{difEnPalabras(dif)} que el INDEC</span>
                        </>
                      )}
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** La tabla completa para quien quiere el índice y el tamaño de la muestra. */
function DetalleTecnico({ serie }: { serie: SerieComparada }) {
  const esClase = serie.nivel === "Clase";
  const th = "py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-strong">
            <th className={`${th} text-left`}>Mes</th>
            <th className={th}>Índice</th>
            <th className={th}>Var. súper</th>
            <th className={th}>Var. INDEC</th>
            <th className={th}>Dif. pp</th>
            {esClase && (
              <>
                <th className={th}>Pares</th>
                <th className={th}>Cadenas</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {serie.puntos.map((p) => (
            <tr key={p.periodo} className="border-b border-hairline">
              <td className="py-1.5 px-2 text-[13px] text-zinc-300">{fmtMes(p.periodo)}</td>
              <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-300">
                {p.propio.toFixed(2).replace(".", ",")}
              </td>
              <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-200">
                {p.propio_var === null ? "base" : fmtPct(p.propio_var)}
              </td>
              <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-400">
                {p.indec_var === null ? "—" : fmtPct(p.indec_var)}
              </td>
              <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-400">
                {p.propio_var !== null && p.indec_var !== null
                  ? fmtPct(diferenciaPp(p.propio_var, p.indec_var)).replace("%", "")
                  : "—"}
              </td>
              {esClase && (
                <>
                  <td className="py-1.5 px-2 text-right tabular text-[12px] text-zinc-500">
                    {p.n_pares?.toLocaleString("es-AR") ?? "—"}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular text-[12px] text-zinc-500">
                    {p.n_cadenas ?? "—"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {esClase && (
        <p className="text-[11px] text-zinc-500 mt-2">
          Pares: producto × cadena con precio en el mes y en el anterior. Cadenas: las que tienen al
          menos 30 pares en la clase; todas pesan lo mismo.
        </p>
      )}
    </div>
  );
}
