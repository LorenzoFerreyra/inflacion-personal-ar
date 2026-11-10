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
  type SerieComparada,
} from "@/lib/indices";

const NIVELES: { nivel: SerieComparada["nivel"]; titulo: string }[] = [
  { nivel: "Division", titulo: "Divisiones" },
  { nivel: "Grupo", titulo: "Grupos" },
  { nivel: "Clase", titulo: "Clases" },
];

function ultimaVariacion(s: SerieComparada): number | null {
  for (let i = s.puntos.length - 1; i >= 0; i--) {
    if (s.puntos[i].propio_var !== null) return s.puntos[i].propio_var;
  }
  return null;
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[26px] font-semibold text-zinc-50">Índices por clase</h1>
        <p className="text-[14px] text-zinc-400 mt-2 max-w-3xl leading-relaxed">
          Índice de precios de supermercados para cada clase COICOP del INDEC, con base{" "}
          {fmtMes(data.base!)} = 100, al lado de la serie del INDEC con el mismo código para la
          región {data.region}. Se comparan los mismos meses y las mismas aperturas: nunca un
          rubro contra el nivel general.
        </p>
        {sinIndec && (
          <p className="mt-4 text-[13px] text-amber-300 bg-amber-tint border border-amber-tint-2 rounded-sm px-4 py-3 max-w-3xl">
            {motivoSinComparacion(data)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
        <nav aria-label="Series" className="space-y-5">
          {NIVELES.map(({ nivel, titulo }) => {
            const series = data.series.filter((s) => s.nivel === nivel);
            if (series.length === 0) return null;
            return (
              <div key={nivel}>
                <h2 className="text-[11px] uppercase text-zinc-500 mb-1.5">{titulo}</h2>
                <ul>
                  {series.map((s) => {
                    const v = ultimaVariacion(s);
                    const activa = s.codigo === seleccionada.codigo;
                    return (
                      <li key={s.codigo}>
                        <button
                          onClick={() => setCodigo(s.codigo)}
                          aria-current={activa ? "true" : undefined}
                          className={`w-full flex items-baseline gap-2 text-left px-2 py-1.5 rounded-sm text-[13px] ${
                            activa ? "bg-amber-tint text-amber-300" : "text-zinc-300 hover:bg-panel-2"
                          }`}
                        >
                          <span className="tabular text-zinc-500 w-11 shrink-0">{s.codigo}</span>
                          <span className="flex-1 truncate" title={s.nombre}>{s.nombre}</span>
                          {!s.comparable && (
                            <span className="text-[10px] text-zinc-600" title={s.motivo ?? undefined}>
                              sin INDEC
                            </span>
                          )}
                          <span className="tabular text-zinc-400 text-[12px]">
                            {v === null ? "—" : fmtPct(v)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <section aria-label={`Detalle de ${seleccionada.nombre}`} className="min-w-0 space-y-5">
          <div>
            <p className="text-[11px] uppercase text-zinc-500">
              {seleccionada.nivel === "Division" ? "División" : seleccionada.nivel} {seleccionada.codigo}
            </p>
            <h2 className="text-lg font-medium text-zinc-50">{seleccionada.nombre}</h2>
            {seleccionada.motivo && (
              <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">{seleccionada.motivo}</p>
            )}
          </div>

          <div className="border-t border-hairline pt-4">
            <IndexChart serie={seleccionada} region={data.region} />
          </div>

          <DetalleMensual serie={seleccionada} />
        </section>
      </div>

      <section className="border-t border-hairline pt-5 max-w-3xl">
        <h2 className="text-[15px] font-medium text-zinc-50 mb-3">Todas las series comparables</h2>
        <ComparacionClases data={data} onSelect={setCodigo} />
      </section>
    </div>
  );
}

function DetalleMensual({ serie }: { serie: SerieComparada }) {
  const esClase = serie.nivel === "Clase";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline-strong">
            <th className="py-2 px-2 text-left text-[11px] font-bold text-zinc-400 uppercase">Mes</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Índice</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Var. súper</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Var. INDEC</th>
            <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Dif. pp</th>
            {esClase && (
              <>
                <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Pares</th>
                <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Cadenas</th>
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
