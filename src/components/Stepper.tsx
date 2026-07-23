"use client";

import { Check } from "@/components/Icons";

interface Props {
  currentStep: number;
  steps: string[];
}

/**
 * Progreso del flujo como secuencia editorial en línea:
 * número en mono + etiqueta, conectados por hairlines.
 */
export default function Stepper({ currentStep, steps }: Props) {
  return (
    <nav aria-label="Progreso" className="flex items-center mb-10">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={i} className="flex items-center min-w-0">
            <div
              className="flex items-baseline gap-2 whitespace-nowrap"
              aria-current={isActive ? "step" : undefined}
            >
              {isDone ? (
                <Check
                  size={13}
                  strokeWidth={2.5}
                  className="text-amber-400 self-center"
                />
              ) : (
                <span
                  className={`tabular text-[13px] ${
                    isActive ? "text-amber-400 font-bold" : "text-zinc-600"
                  }`}
                >
                  {stepNum}
                </span>
              )}
              <span
                className={`text-[13px] ${
                  isDone
                    ? "text-zinc-400"
                    : isActive
                      ? "text-zinc-50 font-medium"
                      : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className="w-8 sm:w-14 h-px mx-3 sm:mx-4 bg-zinc-800 shrink-0" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
