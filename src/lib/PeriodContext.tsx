"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PeriodKey, IpcValues } from "./constants";

interface PeriodContextValue {
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
  ipc: IpcValues;
  ipcError: boolean;
}

const DEFAULT_IPC: IpcValues = { mensual: 0, trimestral: 0, interanual: 0 };

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  const [ipc, setIpc] = useState<IpcValues>(DEFAULT_IPC);
  const [ipcError, setIpcError] = useState(false);

  useEffect(() => {
    fetch("/api/ipc")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setIpc(data);
        setIpcError(false);
      })
      .catch(() => setIpcError(true));
  }, []);

  return (
    <PeriodContext.Provider value={{ period, setPeriod, ipc, ipcError }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be inside PeriodProvider");
  return ctx;
}
