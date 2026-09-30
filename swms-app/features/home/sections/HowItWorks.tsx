"use client";

// Home "How it works": the five-step complaint loop (03-FULL-APP-FLOW F3–F7).

import { useState } from "react";
import { Reveal } from "@/components/shared/Reveal";
import { cn } from "@/lib/utils";
import { STEPS } from "../content/how-it-works";

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];
  const Icon = step.icon;

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-24 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-leaf-600">How it works</p>
          <h2 id="how-title" className="mt-3 section-title text-leaf-950">
            A complaint isn&apos;t done <span className="accent-serif text-leaf-700">until you say so</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Every report follows the same visible path, from photo to proof to your answer. Tap a step.
          </p>
        </Reveal>

        <Reveal className="mt-14">
          <ol className="relative grid gap-3 md:grid-cols-5 md:gap-4" role="list">
            <span
              aria-hidden
              className="absolute left-[10%] right-[10%] top-8 hidden h-1 rounded-full bg-leaf-100 md:block"
            />
            <span
              aria-hidden
              className="absolute left-[10%] top-8 hidden h-1 rounded-full bg-leaf-500 transition-[width] duration-500 ease-[var(--ease-out-soft)] md:block"
              style={{ width: `${(active / (STEPS.length - 1)) * 80}%` }}
            />
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const on = i === active;
              const done = i < active;
              return (
                <li key={s.title} className="relative">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-pressed={on}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors duration-200 md:flex-col md:gap-3 md:p-2 md:text-center",
                      on ? "bg-leaf-50 md:bg-transparent" : "hover:bg-leaf-50/60 md:hover:bg-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "relative z-10 flex size-16 shrink-0 items-center justify-center rounded-2xl border-2 transition-all duration-300 ease-[var(--ease-spring)]",
                        on
                          ? "scale-110 border-leaf-600 bg-leaf-600 text-white shadow-cta"
                          : done
                            ? "border-leaf-500 bg-leaf-100 text-leaf-800"
                            : "border-leaf-100 bg-white text-leaf-700",
                      )}
                    >
                      <StepIcon className="size-7" aria-hidden />
                    </span>
                    <span>
                      <span className="block text-xs font-bold uppercase tracking-wider text-leaf-600">
                        Step {i + 1} · {s.who}
                      </span>
                      <span className="block text-lg font-bold text-leaf-950">{s.title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div
            key={active}
            aria-live="polite"
            className="mx-auto mt-8 flex max-w-3xl items-start gap-4 rounded-3xl bg-leaf-900 p-6 text-white animate-pop sm:p-8"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <Icon className="size-6 text-lime-soft" aria-hidden />
            </span>
            <div>
              <p className="text-xl font-bold">{step.title}</p>
              <p className="mt-2 text-lead leading-relaxed text-white/85">{step.body}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
