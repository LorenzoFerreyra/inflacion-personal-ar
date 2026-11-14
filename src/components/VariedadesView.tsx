"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import VariedadChart from "@/components/VariedadChart";
import { chainLabel } from "@/lib/chainColors";
import { fmtMes, sumarMeses } from "@/lib/canasta";
import { fmtPct } from "@/lib/format";
import {
  MIN_PRODUCTOS,
  diferenciaNivel,
  fmtPesos,
  puntoDe,
  ultimoMesConDatos,
  type PrecioProducto,
  type RespuestaVariedades,
  type Variedad,
} from "@/lib/variedades";

const MAX_PRODUCTOS_LISTA = 40;

function colorDif(d: number | null): string {
  if (d === null) return "text-zinc-500";
  return d > 0 ? "text-red-400" : d < 0 ? "text-green-400" : "text-zinc-400";
}

export default function VariedadesView() {
  const [data, setData] = useState<RespuestaVariedades | null>(null);
  const [error, setError] = useState(false);
  const [mes, setMes] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/variedades", { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: RespuestaVariedades) => setData(d))
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => abort.abort();
  }, []);

  const meses = useMemo(() => {
    if (!data?.desde || !data.ultimoMes) return [];
    const out: string[] = [];
    for (let m = data.desde; m <= data.ultimoMes; m = sumarMeses(m, 1)) out.push(m);
    return out.reverse();
  }, [data]);

  if (error) return <p className="text-sm text-red-400 py-16 text-center">Error al cargar las variedades.</p>;
  if (!data) return <LoadingSpinner message="Cargando precios del INDEC..." />;

  const mesActual = mes ?? ultimoMesConDatos(data.variedades) ?? meses[0];
  const elegida = data.variedades.find((v) => v.id === seleccion) ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[26px] font-semibold text-zinc-50">Precios del INDEC vs. supermercados</h1>
        <p className="text-[14px] text-zinc-400 mt-2 max-w-3xl leading-relaxed">
          El INDEC publica el precio promedio de {data.variedades.length} productos en el GBA. Acá se compara
          cada uno con los mismos productos en los supermercados, llevados a la misma unidad (una yerba de 1 kg
          cuenta como dos de 500 g).
        </p>
        <ul className="mt-3 text-[13px] text-zinc-500 max-w-3xl leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <span className="text-zinc-300">Variación</span>: cada producto contra sí mismo en la misma cadena, mes
            contra mes. Es la comparación firme.
          </li>
          <li>
            <span className="text-zinc-300">Precio</span>: mediana entre productos. Depende de qué marcas vende cada
            súper, así que es orientativo; la banda muestra dónde está la mitad de los productos.
          </li>
          <li>
            Disco, Jumbo y Vea entran solo con precios que coinciden con los de otra cadena: parte de su catálogo
            tiene precios inválidos. Mayo empieza el 14, cuando arrancó el relevamiento.
          </li>
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="mes" className="text-[12px] text-zinc-400">Mes</label>
        <select
          id="mes"
          value={mesActual}
          onChange={(e) => setMes(e.target.value)}
          className="bg-panel border border-hairline-strong rounded-sm px-3 py-1.5 text-sm text-zinc-200"
        >
          {meses.map((m) => (
            <option key={m} value={m}>
              {fmtMes(m)}
              {m === data.desde ? " (desde el 14)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-hairline-strong">
              <th className="py-2 px-2 text-left text-[11px] font-bold text-zinc-400 uppercase">Producto</th>
              <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">INDEC</th>
              <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Súper</th>
              <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Dif. precio</th>
              <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Var. INDEC</th>
              <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Var. súper</th>
              <th className="py-2 px-2 text-right text-[11px] font-bold text-zinc-400 uppercase">Productos</th>
            </tr>
          </thead>
          <tbody>
            {data.variedades.map((v) => (
              <FilaTabla
                key={v.id}
                variedad={v}
                mes={mesActual}
                desde={data.desde}
                activa={v.id === seleccion}
                onSelect={() => setSeleccion(v.id === seleccion ? null : v.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-zinc-500 -mt-5">
        Dif. precio: cuánto más caro (+) o barato (−) es la mediana del súper que el precio del INDEC.
        {mesActual === sumarMeses(data.desde ?? mesActual, 1) &&
          " La variación de este mes es contra mayo, que tiene solo desde el 14."}
      </p>

      {elegida && <Detalle key={elegida.id} variedad={elegida} mes={mesActual} />}
    </div>
  );
}

function FilaTabla({
  variedad,
  mes,
  desde,
  activa,
  onSelect,
}: {
  variedad: Variedad;
  mes: string;
  desde: string | null;
  activa: boolean;
  onSelect: () => void;
}) {
  const p = puntoDe(variedad, mes);
  const dif = p ? diferenciaNivel(p.precio_mediana, p.precio_indec) : null;
  const pocos = p?.n_productos != null && p.n_productos < MIN_PRODUCTOS;
  return (
    <tr
      onClick={onSelect}
      className={`border-b border-hairline cursor-pointer ${activa ? "bg-amber-tint" : "hover:bg-panel-2"}`}
    >
      <td className="py-2 px-2 text-[13px] text-zinc-200">
        {variedad.nombre}
        <span className="text-zinc-500 text-[11px] ml-2">{variedad.unidad}</span>
      </td>
      <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-300">{fmtPesos(p?.precio_indec ?? null)}</td>
      <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-200">
        {variedad.sin_reglas ? <span className="text-zinc-600 text-[11px]">sin equivalente</span> : fmtPesos(p?.precio_mediana ?? null)}
      </td>
      <td className={`py-2 px-2 text-right tabular text-[13px] font-bold ${colorDif(dif)}`}>
        {dif === null ? "—" : `${dif > 0 ? "+" : ""}${dif}%`}
      </td>
      <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-400">
        {p?.var_indec == null || mes === desde ? "—" : fmtPct(p.var_indec)}
      </td>
      <td className="py-2 px-2 text-right tabular text-[13px] text-zinc-200">
        {p?.var_super == null ? "—" : fmtPct(p.var_super)}
      </td>
      <td className="py-2 px-2 text-right tabular text-[12px] text-zinc-500">
        {p?.n_productos ?? "—"}
        {pocos && <span className="ml-1 text-amber-400" title={`Menos de ${MIN_PRODUCTOS} productos`}>pocos</span>}
      </td>
    </tr>
  );
}

function Detalle({ variedad, mes }: { variedad: Variedad; mes: string }) {
  const [productos, setProductos] = useState<PrecioProducto[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Detalle se monta de nuevo con key={id}: el estado arranca vacio.
    const abort = new AbortController();
    fetch(`/api/variedades/${variedad.id}`, { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: PrecioProducto[]) => setProductos(d))
      .catch((err) => {
        if (err.name !== "AbortError") setError(true);
      });
    return () => abort.abort();
  }, [variedad.id]);

  const entran = productos?.filter((p) => p.entra) ?? [];
  const descartados = (productos?.length ?? 0) - entran.length;

  return (
    <section aria-label={`Detalle de ${variedad.nombre}`} className="border-t border-hairline pt-5 space-y-5">
      <div>
        <h2 className="text-lg font-medium text-zinc-50">
          {variedad.nombre} <span className="text-zinc-500 text-sm">· {variedad.unidad}</span>
        </h2>
        {variedad.sin_reglas && <p className="text-[13px] text-zinc-400 mt-1">{variedad.sin_reglas}</p>}
      </div>

      <VariedadChart variedad={variedad} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline-strong">
              {["Mes", "INDEC", "Súper", "Mitad de los productos", "Var. INDEC", "Var. súper", "Productos", "Cadenas"].map((h) => (
                <th key={h} className="py-2 px-2 text-right first:text-left text-[11px] font-bold text-zinc-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variedad.puntos.map((p, i) => (
              <tr key={p.periodo} className={`border-b border-hairline ${p.periodo === mes ? "bg-panel-2" : ""}`}>
                <td className="py-1.5 px-2 text-[13px] text-zinc-300">{fmtMes(p.periodo)}</td>
                <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-300">{fmtPesos(p.precio_indec)}</td>
                <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-200">{fmtPesos(p.precio_mediana)}</td>
                <td className="py-1.5 px-2 text-right tabular text-[12px] text-zinc-500">
                  {p.precio_p25 === null ? "—" : `${fmtPesos(p.precio_p25)} a ${fmtPesos(p.precio_p75)}`}
                </td>
                <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-400">
                  {i === 0 || p.var_indec === null ? "—" : fmtPct(p.var_indec)}
                </td>
                <td className="py-1.5 px-2 text-right tabular text-[13px] text-zinc-200">
                  {p.var_super === null ? "—" : fmtPct(p.var_super)}
                </td>
                <td className="py-1.5 px-2 text-right tabular text-[12px] text-zinc-500">{p.n_productos ?? "—"}</td>
                <td className="py-1.5 px-2 text-right tabular text-[12px] text-zinc-500">{p.n_cadenas ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-[15px] font-medium text-zinc-50 mb-2">Productos del último mes</h3>
        {error && <p className="text-[13px] text-red-400">No se pudieron cargar los productos.</p>}
        {!productos && !error && <p className="text-[13px] text-zinc-500">Cargando productos...</p>}
        {productos && (
          <>
            <p className="text-[12px] text-zinc-500 mb-2">
              {entran.length} precios entran
              {descartados > 0 && `; ${descartados} quedan afuera (sin precio igual en otra cadena, o más de 10 veces lejos de la mediana)`}.
              Precio por {variedad.unidad}.
            </p>
            <ul className="divide-y divide-hairline max-w-3xl">
              {entran.slice(0, MAX_PRODUCTOS_LISTA).map((p) => (
                <li key={`${p.ean}-${p.cadena}`} className="flex items-baseline gap-3 py-1.5 text-[13px]">
                  <span className="flex-1 min-w-0 truncate text-zinc-300" title={p.product_description}>
                    {p.product_description}
                  </span>
                  <span className="text-[11px] text-zinc-500 w-24 shrink-0">{chainLabel(p.cadena)}</span>
                  <span className="tabular text-zinc-200 w-24 text-right shrink-0">{fmtPesos(p.precio)}</span>
                </li>
              ))}
            </ul>
            {entran.length > MAX_PRODUCTOS_LISTA && (
              <p className="text-[11px] text-zinc-500 mt-1">y {entran.length - MAX_PRODUCTOS_LISTA} más.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
