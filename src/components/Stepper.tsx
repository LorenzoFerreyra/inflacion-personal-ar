"use client";

import { Check } from "lucide-react";

interface Props {
  currentStep: number;
  steps: string[];
}

export default function Stepper({ currentStep, steps }: Props) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <div key={i} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  isDone
                    ? "bg-green-500/20 text-green-400 border-2 border-green-500"
                    : isActive
                    ? "bg-blue-500/20 text-blue-400 border-2 border-blue-500"
                    : "bg-zinc-800 text-zinc-500 border-2 border-zinc-700"
                }`}
              >
                {isDone ? <Check size={16} /> : stepNum}
              </div>
              <span
                className={`text-xs mt-1.5 ${
                  isDone
                    ? "text-green-400"
                    : isActive
                    ? "text-blue-400"
                    : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`w-20 h-0.5 mx-2 mb-5 ${
                  stepNum < currentStep ? "bg-green-500/50" : "bg-zinc-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
