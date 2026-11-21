"use client";

import { useState } from "react";
import { fmtMes } from "@/lib/canasta";
import { fmtPct } from "@/lib/format";
import { PERIODS } from "@/lib/constants";
import type { CanastaGuardada, ResultadoGuardado } from "@/lib/canastasGuardadas";

const AVISO_LOCAL = "Se guardan solo en este navegador: si borrás sus datos, se pierden.";

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

function resumenResultado(r: ResultadoGuardado): string {
  return `${PERIODS[r.periodo].label} · ${fmtMes(r.desde)} → ${fmtMes(r.hasta)}`;
}

/* ── Lista del paso 1 ─────────────────────────────────────────────────── */

export function ListaCanastasGuardadas({
  canastas,
  activaId,
  cargando,
  onCargar,
  onBorrar,
}: {
  canastas: CanastaGuardada[];
  activaId: string | null;
  cargando: string | null;
  onCargar: (c: CanastaGuardada) => void;
  onBorrar: (id: string) => void;
}) {
  const [confirmar, setConfirmar] = useState<string | null>(null);
  if (canastas.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="titulo-guardadas">
      <h2 id="titulo-guardadas" className="text-[11px] font-bold uppercase text-zinc-400 border-b border-hairline pb-2 mb-3">
        Canastas guardadas
      </h2>
      <ul className="divide-y divide-hairline">
        {canastas.map((c) => {
          const ultimo = c.resultados[0];
          const activa = c.id === activaId;
          return (
            <li key={c.id} className="py-2.5 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium truncate ${activa ? "text-amber-300" : "text-zinc-200"}`}>
                  {c.nombre}
                </p>
                <p className="text-[11px] text-zinc-500 tabular">
                  {c.eans.length} producto{c.eans.length === 1 ? "" : "s"}
                  {ultimo?.var_pct != null && ` · último: ${fmtPct(ultimo.var_pct)}`}
                </p>
              </div>
              {confirmar === c.id ? (
                <>
                  <button
                    onClick={() => { onBorrar(c.id); setConfirmar(null); }}
                    className="text-[12px] text-red-400 hover:text-red-300 px-2 min-h-[44px]"
                  >
                    Borrar
                  </button>
                  <button
                    onClick={() => setConfirmar(null)}
                    className="text-[12px] text-zinc-400 hover:text-zinc-200 px-2 min-h-[44px]"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onCargar(c)}
                    disabled={cargando !== null}
                    title="Reemplaza la canasta que estás armando"
                    className="text-[12px] text-amber-300 hover:text-amber-200 px-2 min-h-[44px] disabled:opacity-40"
                  >
                    {cargando === c.id ? "Cargando…" : "Cargar"}
                  </button>
                  <button
                    onClick={() => setConfirmar(c.id)}
                    aria-label={`Borrar ${c.nombre}`}
                    className="text-[12px] text-zinc-500 hover:text-red-400 px-2 min-h-[44px]"
                  >
                    Borrar
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-zinc-600 mt-2">{AVISO_LOCAL}</p>
    </section>
  );
}

/* ── Panel del paso 3 ─────────────────────────────────────────────────── */

export function PanelGuardarCanasta({
  activa,
  coincide,
  resultadoActual,
  onGuardarNueva,
  onActualizar,
  onCopiarLink,
}: {
  /** Canasta guardada que se cargó (o se guardó) en esta sesión. */
  activa: CanastaGuardada | null;
  /** La canasta en pantalla tiene los mismos productos que `activa`. */
  coincide: boolean;
  resultadoActual: ResultadoGuardado | null;
  onGuardarNueva: (nombre: string) => boolean;
  onActualizar: () => boolean;
  onCopiarLink: () => Promise<boolean>;
}) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState(false);
  const [copiado, setCopiado] = useState<null | "ok" | "error">(null);

  const anteriores =
    activa && coincide
      ? activa.resultados.filter(
          (r) =>
            !resultadoActual ||
            r.periodo !== resultadoActual.periodo ||
            r.desde !== resultadoActual.desde ||
            r.hasta !== resultadoActual.hasta,
        )
      : [];

  async function copiar() {
    setCopiado((await onCopiarLink()) ? "ok" : "error");
    setTimeout(() => setCopiado(null), 2500);
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(!onGuardarNueva(nombre));
  }

  return (
    <section className="border-t border-hairline pt-6 max-w-2xl" aria-labelledby="titulo-guardar">
      <h3 id="titulo-guardar" className="text-[15px] font-medium text-zinc-50">
        {activa && coincide ? <>Guardada como «{activa.nombre}»</> : "Guardar esta canasta"}
      </h3>

      {activa && coincide ? (
        <p className="text-xs text-zinc-500 mt-1">
          Este cálculo quedó registrado. Volvé más adelante, cargala y calculá de nuevo para ver
          cómo cambió.
        </p>
      ) : (
        <>
          <p className="text-xs text-zinc-500 mt-1 mb-3">
            Para volver a calcularla más adelante y comparar con este resultado. {AVISO_LOCAL}
          </p>
          {activa && (
            <button
              onClick={() => setError(!onActualizar())}
              className="mb-3 text-[13px] text-amber-300 hover:text-amber-200 underline underline-offset-4"
            >
              Actualizar «{activa.nombre}» con estos productos
            </button>
          )}
          <form onSubmit={guardar} className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="nombre-canasta" className="sr-only">Nombre de la canasta</label>
            <input
              id="nombre-canasta"
              type="text"
              maxLength={60}
              placeholder="Nombre (ej: compra del mes)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 bg-panel border border-hairline-strong rounded-sm px-3 py-2.5 text-sm text-zinc-100 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-amber-450 hover:bg-amber-400 text-zinc-950 font-bold px-5 py-2.5 rounded-sm text-sm"
            >
              {activa ? "Guardar como nueva" : "Guardar"}
            </button>
          </form>
        </>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-2">
          No se pudo guardar: el navegador no permite almacenamiento local (¿modo privado?).
        </p>
      )}

      {anteriores.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase text-zinc-400 mb-2">Cálculos anteriores</p>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {anteriores.map((r) => (
              <li key={`${r.fecha}-${r.desde}`} className="flex items-center justify-between gap-4 py-2 px-1 text-[13px]">
                <span className="text-zinc-400 min-w-0">
                  <span className="text-zinc-300">{fmtFecha(r.fecha)}</span>
                  <span className="text-[11px] text-zinc-500 ml-2">{resumenResultado(r)}</span>
                </span>
                <span className="tabular shrink-0 text-zinc-200">
                  {r.var_pct != null ? fmtPct(r.var_pct) : "—"}
                  {r.indec_var != null && (
                    <span className="text-[11px] text-zinc-500 ml-2">INDEC {fmtPct(r.indec_var)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={copiar}
        className="mt-5 text-[13px] text-zinc-400 hover:text-zinc-100 underline decoration-dotted underline-offset-4"
      >
        {copiado === "ok"
          ? "Link copiado"
          : copiado === "error"
            ? "No se pudo copiar el link"
            : "Copiar link de esta canasta"}
      </button>
      <p className="text-[11px] text-zinc-600 mt-1">
        El link lleva solo la lista de productos: sirve para abrirla en otro dispositivo o
        compartirla.
      </p>
    </section>
  );
}
