// Home "What you can report": issue-type flip cards (02-PRD F2).

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { ISSUES } from "../content/issue-types";
import { FlipMedia } from "../widgets/FlipMedia";

export function IssueTypes() {
  return (
    <section
      id="report"
      aria-labelledby="report-title"
      className="relative scroll-mt-24 overflow-hidden bg-leaf-900 py-20 text-white sm:py-28"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_0%,rgba(159,201,123,0.25),transparent_70%),radial-gradient(50%_50%_at_0%_100%,rgba(79,146,52,0.35),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-lime-soft">What you can report</p>
            <h2 id="report-title" className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
              Seen a waste problem? <span className="font-serif font-normal italic text-lime-soft">Tell us.</span>
            </h2>
          </div>
          <Link
            href="/report/new"
            className="group inline-flex h-12 w-fit items-center gap-2 rounded-full bg-lime-soft px-6 font-semibold text-leaf-950 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            Report an issue
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </Reveal>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5" role="list">
          {ISSUES.map(({ icon: Icon, title, img, hint, tone }, i) => (
            <Reveal as="li" key={title} delay={i * 70}>
              <Link
                href="/report/new"
                className="group flex h-full flex-col rounded-3xl bg-white/[0.06] p-3 ring-1 ring-white/10 transition-[transform,background-color] duration-300 ease-[var(--ease-spring)] hover:-translate-y-1.5 hover:bg-white/[0.1] active:scale-[0.98]"
              >
                <FlipMedia
                  front={
                    <>
                      <Image
                        src={img}
                        alt={`Example photo: ${title.toLowerCase()}`}
                        fill
                        sizes="(min-width: 1024px) 240px, 50vw"
                        className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
                      />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-leaf-950/45 via-transparent to-transparent" />
                    </>
                  }
                  back={
                    <span className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${tone}`}>
                      <span aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-white/15" />
                      <span aria-hidden className="absolute -bottom-8 -left-4 size-20 rounded-full bg-leaf-950/15" />
                      <Icon className="relative size-14 text-white drop-shadow" strokeWidth={1.6} aria-hidden />
                    </span>
                  }
                />
                <span className="mt-4 px-1 text-base font-bold leading-tight sm:px-2 sm:text-lg">{title}</span>
                <span className="mt-1 mb-4 px-1 text-sm text-white/70 sm:px-2">{hint}</span>
                <span className="mt-auto flex w-fit translate-y-0 items-center gap-0 overflow-hidden rounded-lg bg-white text-xs font-semibold text-leaf-900">
                  <span className="px-3 py-1.5">Photo</span>
                  <span aria-hidden className="h-4 w-px bg-leaf-200" />
                  <span className="px-3 py-1.5">Location</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
