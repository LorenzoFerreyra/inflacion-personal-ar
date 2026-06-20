"use client";

import { Check } from "@/components/Icons";

interface Props {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: Props) {
  return (
    <div className="flex items-center justify-center mb-12">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium
                  ${
                    isDone
                      ? "bg-green-500/15 text-green-400 border border-green-500/40"
                      : isActive
                        ? "bg-amber-500/10 text-amber-300 border border-amber-400/40"
                        : "bg-zinc-800/40 text-zinc-500 border border-zinc-700/40"
                  }
                `}
              >
                {isDone ? <Check size={15} strokeWidth={2} /> : stepNum}
              </div>
              <span
                className={`text-[11px] font-medium mt-2.5 tracking-wide ${
                  isDone
                    ? "text-green-400/70"
                    : isActive
                      ? "text-amber-300/70"
                      : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`w-20 h-px mx-4 mb-7 ${
                  stepNum < currentStep
                    ? "bg-green-500/30"
                    : "bg-zinc-800/60"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
