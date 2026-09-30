"use client";

// Tappable sample case that steps through the case statuses.

import { useState } from "react";
import { cn } from "@/lib/utils";
import { STEPS } from "../content/sample-case";

export function CaseTrackerCard({ className }: { className?: string }) {
  const [step, setStep] = useState(1);
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={() => setStep((s) => (s + 1) % STEPS.length)}
      aria-label={`Sample case. Status: ${current.status}. ${current.note}. Tap to see the next step.`}
      className={cn(
        "group w-[250px] rotate-[-3deg] rounded-3xl bg-white p-5 text-left shadow-[0_24px_50px_-24px_rgba(22,52,25,0.45)] ring-1 ring-leaf-100 transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:rotate-[-1deg] active:scale-[0.97]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-leaf-950">Track your case</span>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300">
          Demo
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Overflowing bin · Market Lane</p>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div key={step} className="animate-pop">
          <p className="flex items-center gap-1.5 text-xl font-extrabold leading-tight tracking-tight text-leaf-900">
            <Icon className="size-5" aria-hidden />
            {current.status}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{current.note}</p>
        </div>
        <div aria-hidden className="flex h-12 items-end gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "w-2.5 rounded-sm transition-all duration-500 ease-[var(--ease-spring)]",
                i <= step ? "bg-leaf-500" : "bg-leaf-100",
              )}
              style={{ height: `${(i + 1) * 25}%` }}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium text-leaf-700 opacity-80 group-hover:opacity-100">
        Tap to follow the case →
      </p>
    </button>
  );
}
