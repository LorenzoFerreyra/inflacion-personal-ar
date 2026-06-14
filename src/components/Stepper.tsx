"use client";

import { Check } from "@/components/Icons";

interface Props {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: Props) {
  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  shadow-lg
                  ${
                    isDone
                      ? "bg-green-500/20 text-green-400 border-2 border-green-500/60 shadow-green-500/10"
                      : isActive
                        ? "bg-amber-500/15 text-amber-300 border-2 border-amber-400/50 shadow-amber-500/10"
                        : "bg-zinc-800/60 text-zinc-500 border-2 border-zinc-700/50"
                  }
                `}
              >
                {isDone ? <Check size={16} strokeWidth={2.5} /> : stepNum}
              </div>
              <span
                className={`text-[11px] font-medium mt-2 tracking-wide ${
                  isDone
                    ? "text-green-400/80"
                    : isActive
                      ? "text-amber-300/80"
                      : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`w-24 h-px mx-3 mb-6 ${
                  stepNum < currentStep
                    ? "bg-gradient-to-r from-green-500/50 to-green-500/20"
                    : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
