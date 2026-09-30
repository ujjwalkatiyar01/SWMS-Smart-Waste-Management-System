// Home "Features": the six required features (02-PRD F1–F6).

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/shared/Reveal";
import { FEATURES } from "../content/features";

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-leaf-600">Everything in one place</p>
          <h2 id="features-title" className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.03em] text-leaf-950 sm:text-5xl">
            For residents, workers <span className="font-serif font-normal italic text-leaf-700">and admins</span>
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {FEATURES.map(({ icon: Icon, title, body, href }, i) => (
            <Reveal as="li" key={title} delay={(i % 3) * 80}>
              <Link
                href={href}
                className="group relative flex h-full flex-col rounded-3xl border border-leaf-100 bg-white p-6 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:border-leaf-300 hover:shadow-[0_24px_50px_-28px_rgba(22,52,25,0.45)] active:scale-[0.98]"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-leaf-50 text-leaf-700 transition-colors duration-300 group-hover:bg-leaf-600 group-hover:text-white">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="mt-5 text-xl font-bold text-leaf-950">{title}</span>
                <span className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</span>
                <ArrowUpRight
                  className="absolute right-6 top-6 size-5 text-leaf-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-leaf-700"
                  aria-hidden
                />
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
