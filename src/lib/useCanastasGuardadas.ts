"use client";

import { useSyncExternalStore } from "react";
import {
  STORAGE_KEY,
  leerCanastas,
  storageLocal,
  type CanastaGuardada,
} from "./canastasGuardadas";

/**
 * Canastas guardadas como store externo de React: el servidor (y la
 * hidratación) ven [], el cliente lee localStorage. Se re-lee cuando otra
 * pestaña cambia el storage o cuando esta llama a `avisarCambioCanastas`.
 */

const SIN_CANASTAS: CanastaGuardada[] = [];
const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cacheVal: CanastaGuardada[] = SIN_CANASTAS;

function snapshot(): CanastaGuardada[] {
  const store = storageLocal();
  let raw: string | null = null;
  try {
    raw = store?.getItem(STORAGE_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheVal = raw ? leerCanastas(store) : SIN_CANASTAS;
  }
  return cacheVal;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Llamar después de escribir en el storage desde esta pestaña. */
export function avisarCambioCanastas(): void {
  listeners.forEach((l) => l());
}

export function useCanastasGuardadas(): CanastaGuardada[] {
  return useSyncExternalStore(subscribe, snapshot, () => SIN_CANASTAS);
}
