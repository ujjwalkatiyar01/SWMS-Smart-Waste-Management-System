// Shared frame for login and sign-up, using the home palette and the approved clean-city image.

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { AuthTabs } from "../widgets/AuthTabs";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex flex-1 items-center bg-leaf-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-leaf-100 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative min-h-72 overflow-hidden bg-leaf-800 sm:min-h-80 lg:min-h-full">
          <Image
            src="/images/auth/clean-city-scene.webp"
            alt="A clean, tree-lined neighbourhood street with a sanitation worker beside sorted waste bins"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-t from-leaf-950/90 via-leaf-950/25 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9 lg:p-12">
            <p className="text-sm font-bold uppercase tracking-widest text-lime-soft">A cleaner place starts with us</p>
            <h2 className="mt-3 max-w-lg text-3xl font-extrabold leading-tight text-balance sm:text-4xl">
              Cleaner city, <span className="accent-serif">one report at a time.</span>
            </h2>
            <p className="mt-3 max-w-md text-ui text-white/90">See what needs attention. Report it. Follow the progress.</p>
          </div>
        </div>

        <div className="flex flex-col px-5 py-6 sm:px-10 sm:py-9 lg:px-12">
          <Logo preload className="w-32" />
          <div className="my-auto w-full max-w-md py-7 sm:py-10">
            <AuthTabs />
            <div className="mt-7">{children}</div>
          </div>
          <nav aria-label="Leave sign-in" className="flex flex-wrap items-center gap-1 border-t border-leaf-100 pt-4">
            <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-leaf-900 hover:bg-leaf-50">
              <ArrowLeft className="size-4" aria-hidden /> Home
            </Link>
            <Link href="/awareness" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-leaf-900 hover:bg-leaf-50">
              <BookOpen className="size-4" aria-hidden /> Segregation guide
            </Link>
          </nav>
        </div>
      </div>
    </main>
  );
}
