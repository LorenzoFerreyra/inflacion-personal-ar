/**
 * canastasGuardadas.ts — Canastas guardadas en el navegador (localStorage).
 *
 * Sin cuentas ni servidor: cada canasta guarda sus EANs y los resultados de
 * cada vez que se calculó, para comparar "la última vez te dio X %, hoy Y %".
 * Si el usuario borra los datos del navegador, se pierden (la UI lo avisa).
 *
 * Las funciones reciben el Storage para poder testearlas; leer nunca tira:
 * un JSON roto o un storage bloqueado (modo privado) devuelve [].
 */

import type { PeriodKey } from "./constants";
import { PERIOD_KEYS } from "./constants";
import { isValidEan, parseEans } from "./shared";

export const STORAGE_KEY = "canastas-guardadas-v1";
export const MAX_CANASTAS = 20;
export const MAX_RESULTADOS = 12;
export const MAX_NOMBRE = 60;

/** Un cálculo de la canasta: lo justo para comparar en el tiempo. */
export interface ResultadoGuardado {
  /** Cuándo se calculó (ISO). */
  fecha: string;
  periodo: PeriodKey;
  /** Meses comparados, AAAA-MM-01. */
  desde: string;
  hasta: string;
  var_pct: number | null;
  indec_var: number | null;
}

export interface CanastaGuardada {
  id: string;
  nombre: string;
  eans: string[];
  creada: string;
  /** Más reciente primero. */
  resultados: ResultadoGuardado[];
}

type Store = Pick<Storage, "getItem" | "setItem">;

function esResultado(r: unknown): r is ResultadoGuardado {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  const numONull = (v: unknown) => v === null || typeof v === "number";
  return (
    typeof o.fecha === "string" &&
    PERIOD_KEYS.includes(o.periodo as PeriodKey) &&
    typeof o.desde === "string" &&
    typeof o.hasta === "string" &&
    numONull(o.var_pct) &&
    numONull(o.indec_var)
  );
}

function esCanasta(c: unknown): c is CanastaGuardada {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.nombre === "string" &&
    typeof o.creada === "string" &&
    Array.isArray(o.eans) &&
    o.eans.length > 0 &&
    o.eans.every((e) => typeof e === "string" && isValidEan(e)) &&
    Array.isArray(o.resultados) &&
    o.resultados.every(esResultado)
  );
}

export function leerCanastas(store: Store | null | undefined): CanastaGuardada[] {
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(esCanasta) : [];
  } catch {
    return [];
  }
}

/** Devuelve false si no se pudo escribir (cuota, modo privado). */
function escribir(store: Store | null | undefined, canastas: CanastaGuardada[]): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(canastas));
    return true;
  } catch {
    return false;
  }
}

function nuevoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** Misma composición, sin importar el orden. */
export function mismosEans(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((e) => s.has(e));
}

/**
 * Guarda una canasta nueva (la pone primera). Si ya hay MAX_CANASTAS, se
 * descarta la más vieja. Devuelve la canasta creada, o null si falló.
 */
export function guardarCanasta(
  store: Store | null | undefined,
  datos: { nombre: string; eans: string[]; resultado?: ResultadoGuardado | null },
  ahora: Date = new Date(),
): CanastaGuardada | null {
  const eans = [...new Set(datos.eans.filter(isValidEan))];
  if (eans.length === 0) return null;
  const nombre = datos.nombre.trim().slice(0, MAX_NOMBRE) || "Mi canasta";
  const canasta: CanastaGuardada = {
    id: nuevoId(),
    nombre,
    eans,
    creada: ahora.toISOString(),
    resultados: datos.resultado ? [datos.resultado] : [],
  };
  const todas = [canasta, ...leerCanastas(store)].slice(0, MAX_CANASTAS);
  return escribir(store, todas) ? canasta : null;
}

/** Mismo cálculo: mismo período y mismos meses comparados. */
function mismoCalculo(a: ResultadoGuardado, b: ResultadoGuardado): boolean {
  return a.periodo === b.periodo && a.desde === b.desde && a.hasta === b.hasta;
}

/**
 * Agrega un cálculo a una canasta guardada (más reciente primero). Si ya
 * había uno del mismo período y meses, lo reemplaza: recalcular dos veces el
 * mismo día no debe llenar el historial de repetidos.
 */
export function agregarResultado(
  store: Store | null | undefined,
  id: string,
  resultado: ResultadoGuardado,
): CanastaGuardada | null {
  const todas = leerCanastas(store);
  const i = todas.findIndex((c) => c.id === id);
  if (i === -1) return null;
  const previos = todas[i].resultados.filter((r) => !mismoCalculo(r, resultado));
  const actualizada: CanastaGuardada = {
    ...todas[i],
    resultados: [resultado, ...previos].slice(0, MAX_RESULTADOS),
  };
  todas[i] = actualizada;
  return escribir(store, todas) ? actualizada : null;
}

/** Reemplaza los productos de una canasta guardada (los resultados viejos se conservan). */
export function actualizarEans(
  store: Store | null | undefined,
  id: string,
  eans: string[],
): CanastaGuardada | null {
  const limpios = [...new Set(eans.filter(isValidEan))];
  if (limpios.length === 0) return null;
  const todas = leerCanastas(store);
  const i = todas.findIndex((c) => c.id === id);
  if (i === -1) return null;
  todas[i] = { ...todas[i], eans: limpios };
  return escribir(store, todas) ? todas[i] : null;
}

export function borrarCanasta(store: Store | null | undefined, id: string): CanastaGuardada[] {
  const restantes = leerCanastas(store).filter((c) => c.id !== id);
  escribir(store, restantes);
  return restantes;
}

/** EANs del parámetro `?eans=` de un link compartido. */
export function eansDesdeUrl(search: string): string[] {
  return [...new Set(parseEans(new URLSearchParams(search).get("eans")))];
}

/** Link para compartir la canasta: la misma página con `?eans=`. */
export function urlCompartir(origin: string, pathname: string, eans: string[]): string {
  const params = new URLSearchParams({ eans: eans.join(",") });
  return `${origin}${pathname}?${params.toString().replace(/%2C/g, ",")}`;
}

/** Acceso seguro a localStorage (puede tirar en modo privado o con cookies bloqueadas). */
export function storageLocal(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
