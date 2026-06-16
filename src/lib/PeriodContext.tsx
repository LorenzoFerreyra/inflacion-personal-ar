"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PeriodKey, IpcValues } from "./constants";

interface PeriodContextValue {
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
  ipc: IpcValues;
}

const DEFAULT_IPC: IpcValues = { mensual: 0, trimestral: 0, interanual: 0 };

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [ipc, setIpc] = useState<IpcValues>(DEFAULT_IPC);

  useEffect(() => {
    fetch("/api/ipc")
      .then((res) => res.json())
      .then(setIpc)
      .catch(() => {});
  }, []);

  return (
    <PeriodContext.Provider value={{ period, setPeriod, ipc }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be inside PeriodProvider");
  return ctx;
}
