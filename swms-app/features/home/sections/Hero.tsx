// ─────────────────────────────────────────────────────────────
// Module · Home › Hero section (first screen)
// Headline, the two main calls to action, the animated park scene
// with the mascot, quick links and the sample case card.
// Used by: features/home/index.ts → app/(public)/page.tsx
// Uses:    scene/HeroScene, widgets/Mascot, widgets/CaseTrackerCard,
//          content/hero-points
// Spec:    01-FRONTEND §3 route "/"
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { ArrowRight, BookOpen, Camera, TreeDeciduous } from "lucide-react";
import { POINTS } from "../content/hero-points";
import { HeroScene } from "../scene/HeroScene";
import { CaseTrackerCard } from "../widgets/CaseTrackerCard";
import { Mascot } from "../widgets/Mascot";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate -mt-18 overflow-hidden pt-18 lg:-mt-20 lg:pt-20">
      {/* Sky */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(120%_70%_at_50%_0%,#ffffff_0%,var(--color-cream)_45%,var(--color-sky-soft)_100%)]"
      />

      <div className="mx-auto max-w-7xl px-4 pt-8 text-center sm:px-6 sm:pt-12 lg:px-8 lg:pt-14">
        <h1 id="hero-title" className="mx-auto max-w-5xl">
          <span className="block text-[clamp(2.6rem,8vw,6.25rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-leaf-950 animate-rise">
            Report it. Track it.
          </span>
          <span
            className="mt-1 block font-serif text-[clamp(3rem,9.5vw,7.5rem)] italic leading-[0.95] tracking-[-0.02em] text-leaf-700 animate-rise"
            style={{ animationDelay: "120ms" }}
          >
            See it cleaned.
          </span>
        </h1>
        <p
          className="mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-leaf-950/75 sm:text-lg animate-rise"
          style={{ animationDelay: "240ms" }}
        >
          One place to report waste problems, follow every complaint to a real outcome, and help your area
          stay clean.
        </p>
        <div
          className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row animate-rise"
          style={{ animationDelay: "360ms" }}
        >
          <Link
            href="/report/new"
            className="group inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[0_12px_28px_-10px_rgba(46,100,32,0.65)] transition-[transform,background-color] duration-200 hover:bg-leaf-800 active:scale-[0.97] sm:w-auto"
          >
            <Camera className="size-5" aria-hidden />
            Report an issue
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/awareness"
            className="inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full border-2 border-leaf-200 bg-white/70 px-7 text-base font-semibold text-leaf-900 backdrop-blur transition-[transform,border-color] duration-200 hover:border-leaf-400 active:scale-[0.97] sm:w-auto"
          >
            <BookOpen className="size-5" aria-hidden />
            Segregation guide
          </Link>
        </div>
      </div>

      {/* Stage: scene + mascot, with the list and cards on either side on large screens */}
      <div className="relative mt-2 lg:mt-0">
        <div className="relative h-[400px] sm:h-[480px] lg:h-[600px]">
          <HeroScene className="absolute inset-0 -z-10 h-full w-full" />
          <div className="absolute inset-x-0 bottom-[7%] flex justify-center">
            <Mascot />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:pointer-events-none lg:absolute lg:inset-0 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-0">
          <div className="lg:pointer-events-auto lg:max-w-[300px] lg:-translate-y-16 lg:rounded-3xl lg:bg-cream/70 lg:p-5 lg:backdrop-blur-sm">
            <h2 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-leaf-950 lg:text-[34px]">
              Together for cleaner, greener places
            </h2>
            <ul className="mt-5 space-y-1">
              {POINTS.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="group -mx-2 flex min-h-11 items-center gap-3 rounded-xl px-2 text-[16px] font-medium text-leaf-950/85 transition-colors hover:bg-white/80 active:bg-leaf-100"
                  >
                    <Icon className="size-5 text-leaf-700 transition-transform duration-200 group-hover:scale-110" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-start justify-center gap-5 lg:pointer-events-auto lg:-translate-y-20 lg:flex-col lg:items-end">
            <CaseTrackerCard />
            <Link
              href="/awareness"
              className="group flex w-[200px] rotate-[4deg] flex-col gap-3 rounded-3xl bg-lime-soft p-5 shadow-[0_24px_50px_-24px_rgba(22,52,25,0.45)] transition-transform duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:rotate-[2deg] active:scale-[0.97] lg:mr-[-12px]"
            >
              <span className="text-[17px] font-bold leading-tight text-leaf-950">Greener communities</span>
              <TreeDeciduous
                className="size-11 text-leaf-900 transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6 group-hover:scale-110"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-xs font-medium text-leaf-900/80">Wet, dry, hazardous, e-waste: learn what goes where →</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
