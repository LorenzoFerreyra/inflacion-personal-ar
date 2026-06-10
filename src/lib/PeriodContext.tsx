"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { PeriodKey } from "./constants";

interface PeriodContextValue {
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<PeriodKey>("mensual");
  return (
    <PeriodContext.Provider value={{ period, setPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be inside PeriodProvider");
  return ctx;
}
