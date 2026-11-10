"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { PeriodKey, IpcValues } from "./constants";
import type { RespuestaPeriodos } from "./types";

interface PeriodContextValue {
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
  ipc: IpcValues;
  ipcError: boolean;
  /** Períodos con precios comparables (null hasta que llega /api/periodos). */
  periodos: RespuestaPeriodos | null;
}

const DEFAULT_IPC: IpcValues = { mensual: 0, trimestral: 0, interanual: 0 };

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [ipc, setIpc] = useState<IpcValues>(DEFAULT_IPC);
  const [ipcError, setIpcError] = useState(false);
  const [periodos, setPeriodos] = useState<RespuestaPeriodos | null>(null);

  useEffect(() => {
    const abort = new AbortController();

    fetch("/api/ipc", { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setIpc(data);
        setIpcError(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setIpcError(true);
      });

    fetch("/api/periodos", { signal: abort.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: RespuestaPeriodos) => setPeriodos(data))
      .catch(() => {
        // Sin la respuesta no se deshabilita ningún período: la API de
        // productos igual devuelve variación null fuera del tramo comparable.
      });

    return () => abort.abort();
  }, []);

  return (
    <PeriodContext.Provider value={{ period, setPeriod, ipc, ipcError, periodos }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be inside PeriodProvider");
  return ctx;
}
