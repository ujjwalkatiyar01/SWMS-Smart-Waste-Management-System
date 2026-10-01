"use client";

// Public segregation guide (02-PRD F6, 03-FULL-APP-FLOW F10.1–10.3). Text and sources: content/awareness.json.

import Link from "next/link";
import { Noto_Sans_Devanagari } from "next/font/google";
import { ArrowRight, Camera, CircleCheck, Cpu, ExternalLink, Leaf, Recycle, ShieldPlus, TriangleAlert, BellRing } from "lucide-react";
import content from "@/content/awareness.json";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "../widgets/LanguageToggle";
import { useLanguage } from "../widgets/useLanguage";
import { WhichBin } from "../widgets/WhichBin";

const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600", "700", "800"], display: "swap" });

const STREAM_STYLE = {
  wet: { icon: Leaf, tone: "bg-leaf-100 text-leaf-800" },
  dry: { icon: Recycle, tone: "bg-sky-soft text-sky-900" },
  sanitary: { icon: ShieldPlus, tone: "bg-rose-50 text-rose-800" },
  special: { icon: TriangleAlert, tone: "bg-warning-soft text-warning" },
  ewaste: { icon: Cpu, tone: "bg-violet-50 text-violet-800" },
} as const;

const STEP_ICON = { report: Camera, track: BellRing, confirm: CircleCheck } as const;

type SourceKey = keyof typeof content.sources;

export function AwarenessGuide() {
  const [lang, setLang] = useLanguage();
  const t = content.ui[lang];

  return (
    <div lang={lang} className={cn(lang === "hi" && devanagari.className)}>
      <section aria-labelledby="awareness-title" className="bg-leaf-50 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              {/* Wide letter spacing splits Devanagari letters, so Hindi keeps normal spacing */}
              <p className={cn("eyebrow text-leaf-600", lang === "hi" && "tracking-normal")}>{t.eyebrow}</p>
              <h1 id="awareness-title" className="mt-3 section-title text-leaf-950">
                {t.title} <span className="accent-serif text-leaf-700">{t.titleAccent}</span>
              </h1>
              <p className="mt-4 text-lead leading-relaxed text-leaf-950/80">{t.intro}</p>
            </div>
            <LanguageToggle value={lang} onChange={setLang} label={t.language} />
          </div>

          <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.streams.map((stream) => {
              const { icon: Icon, tone } = STREAM_STYLE[stream.id as keyof typeof STREAM_STYLE];
              const text = stream[lang];
              const source = content.sources[stream.source as SourceKey][lang];
              return (
                <li key={stream.id} className="flex flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-leaf-100">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", tone)}>
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <h2 className="text-xl font-bold text-leaf-950">{text.name}</h2>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-leaf-950/80">{t.examples}</p>
                  <ul role="list" className="mt-2 flex flex-wrap gap-2">
                    {text.examples.map((example) => (
                      <li key={example} className="rounded-full bg-leaf-50 px-3 py-1 text-sm text-leaf-900 ring-1 ring-leaf-100">
                        {example}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-5 text-sm font-semibold text-leaf-950/80">{t.next}</p>
                  <p className="mt-1 text-ui leading-relaxed text-leaf-950">{text.next}</p>

                  <p className="mt-auto pt-5 text-xs leading-relaxed text-leaf-950/70">
                    {t.source}:{" "}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-baseline gap-1 font-medium text-leaf-800 underline underline-offset-2 hover:text-leaf-950"
                    >
                      {source.title}
                      <ExternalLink className="size-3 shrink-0 self-center" aria-hidden />
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <WhichBin />

      <section aria-labelledby="how-to-title" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="how-to-title" className="section-title text-leaf-950">
            {t.howTitle}
          </h2>
          <ol role="list" className="mt-8 grid gap-4 md:grid-cols-3">
            {content.howTo.map((step, i) => {
              const Icon = STEP_ICON[step.id as keyof typeof STEP_ICON];
              return (
                <li key={step.id} className="flex gap-4 rounded-3xl bg-leaf-50 p-5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-leaf-700 text-white">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lead font-bold text-leaf-950">
                      {i + 1}. {step[lang].title}
                    </h3>
                    <p className="mt-1 text-ui leading-relaxed text-leaf-950/80">{step[lang].text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <Link
            href="/report/new"
            className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-leaf-700 px-6 font-semibold text-white shadow-cta transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            {t.report}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/pickup/new"
            lang="en"
            className="ml-3 mt-3 inline-flex min-h-12 items-center gap-2 rounded-full border border-leaf-300 bg-white px-6 font-semibold text-leaf-900 hover:bg-leaf-50"
          >
            Request a pickup <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
