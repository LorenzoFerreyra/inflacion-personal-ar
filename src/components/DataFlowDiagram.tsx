"use client";

import { useEffect, useRef, useState } from "react";
import { chainLabel } from "@/lib/chainColors";

const STAGES = [
  {
    id: "sources",
    label: "Supermercados",
    sublabel: "Portales públicos de precios",
    icon: "store",
  },
  {
    id: "scraper",
    label: "Recolección",
    sublabel: "Scraping diario automatizado",
    icon: "download",
  },
  {
    id: "database",
    label: "Base de datos",
    sublabel: "Series históricas de precios",
    icon: "database",
  },
  {
    id: "processing",
    label: "Procesamiento",
    sublabel: "Cálculo de variaciones e IPC",
    icon: "cpu",
  },
  {
    id: "app",
    label: "Observatorio",
    sublabel: "Visualización interactiva",
    icon: "chart",
  },
] as const;

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M10 9h4" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M8 5H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-4" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 3 5-7" />
    </svg>
  );
}

const ICON_MAP = {
  store: StoreIcon,
  download: DownloadIcon,
  database: DatabaseIcon,
  cpu: CpuIcon,
  chart: ChartIcon,
} as const;

interface Particle {
  id: number;
  fromStage: number;
  progress: number;
  speed: number;
  label?: string;
}

interface Props {
  chains?: string[];
}

export default function DataFlowDiagram({ chains = [] }: Props) {
  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const stageIdx = Math.floor(Math.random() * (STAGES.length - 1));
      const label =
        stageIdx === 0 && chains.length > 0
          ? chainLabel(chains[Math.floor(Math.random() * chains.length)])
          : undefined;
      setParticles((prev) => [
        ...prev.filter((p) => p.progress < 1),
        {
          id: nextId.current++,
          fromStage: stageIdx,
          progress: 0,
          speed: 0.015 + Math.random() * 0.01,
          label,
        },
      ]);
    }, 400);

    return () => clearInterval(interval);
  }, [chains]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + p.speed }))
          .filter((p) => p.progress < 1.2),
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const stageDescriptions: Record<string, string> = {
    sources:
      "Los precios se obtienen de los portales públicos de las principales cadenas de supermercados de Argentina, en cumplimiento con la normativa de transparencia de precios.",
    scraper:
      "Un proceso automatizado recolecta diariamente los precios de miles de productos, registrando EAN, precio de lista, cadena y fecha.",
    database:
      "Los datos se almacenan en una base SQLite con series históricas de precios y un catálogo canónico de productos con marca y categoría.",
    processing:
      "Se calculan variaciones porcentuales por período (30, 90 o 365 días) y se comparan contra el IPC del INDEC para contextualizar.",
    app: "El observatorio presenta los datos con tablas interactivas, gráficos de evolución y comparaciones por cadena de supermercado.",
  };

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 md:p-8 space-y-6"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-0.5 h-4 rounded-full bg-amber-400/60 shrink-0" />
        <h3 className="text-[15px] font-semibold text-zinc-200">
          Flujo de datos
        </h3>
      </div>

      {/* Pipeline */}
      <div className="relative">
        {/* Stage nodes */}
        <div className="flex items-center justify-between gap-1 relative z-10">
          {STAGES.map((stage, i) => {
            const Icon = ICON_MAP[stage.icon];
            const isActive = activeStage === i;
            return (
              <div
                key={stage.id}
                className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
                onMouseEnter={() => setActiveStage(i)}
                onMouseLeave={() => setActiveStage(null)}
              >
                {/* Node */}
                <div
                  className={`
                    relative w-14 h-14 md:w-16 md:h-16 rounded-2xl border
                    flex items-center justify-center transition-all duration-300
                    ${
                      isActive
                        ? "border-amber-400/80 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.15)] scale-110"
                        : "border-zinc-700/60 bg-zinc-800/60 hover:border-zinc-600/80"
                    }
                  `}
                >
                  <Icon
                    className={`w-6 h-6 md:w-7 md:h-7 transition-colors duration-300 ${
                      isActive
                        ? "text-amber-400"
                        : "text-zinc-400 group-hover:text-zinc-300"
                    }`}
                  />
                  {/* Pulse ring */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-2xl border border-amber-400/40 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={`text-xs md:text-sm font-medium transition-colors duration-300 ${
                      isActive ? "text-amber-300" : "text-zinc-300"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[10px] md:text-xs text-zinc-500 mt-0.5 hidden sm:block">
                    {stage.sublabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Connector lines + particles (SVG overlay) */}
        <svg
          className="absolute top-7 md:top-8 left-0 w-full h-3 z-0 pointer-events-none"
          preserveAspectRatio="none"
        >
          {/* Background track */}
          {[0, 1, 2, 3].map((i) => {
            const x1 = `${(i / (STAGES.length - 1)) * 100 + 6}%`;
            const x2 = `${((i + 1) / (STAGES.length - 1)) * 100 - 6}%`;
            return (
              <line
                key={i}
                x1={x1}
                y1="50%"
                x2={x2}
                y2="50%"
                stroke="rgba(113,113,122,0.25)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Animated particles */}
          {particles.map((p) => {
            if (p.progress > 1) return null;
            const fromPct = (p.fromStage / (STAGES.length - 1)) * 100 + 6;
            const toPct = ((p.fromStage + 1) / (STAGES.length - 1)) * 100 - 6;
            const cx = fromPct + (toPct - fromPct) * p.progress;
            const opacity =
              p.progress < 0.1
                ? p.progress * 10
                : p.progress > 0.9
                  ? (1 - p.progress) * 10
                  : 1;
            return (
              <circle
                key={p.id}
                cx={`${cx}%`}
                cy="50%"
                r="3"
                fill="#fbbf24"
                opacity={opacity * 0.9}
              >
                <animate
                  attributeName="r"
                  values="2;4;2"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      <div
        className={`overflow-hidden transition-all duration-500 ${
          activeStage !== null ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {activeStage !== null && (
          <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/60 p-4 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-medium text-amber-300/90">
                {STAGES[activeStage].label}
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {stageDescriptions[STAGES[activeStage].id]}
            </p>
          </div>
        )}
      </div>

      {/* Live counter */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <p className="text-xs text-zinc-500">
          Datos actualizados diariamente de forma automática
        </p>
      </div>
    </div>
  );
}
