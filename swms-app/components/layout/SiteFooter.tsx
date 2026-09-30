// Site footer: closing call to action, links, sample-data note.

import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Reveal } from "@/components/shared/Reveal";

export function SiteFooter() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-lime-soft px-6 py-12 text-center sm:px-12 sm:py-16">
          <span aria-hidden className="absolute -left-10 -top-10 size-40 rounded-full bg-white/40" />
          <span aria-hidden className="absolute -bottom-16 -right-8 size-56 rounded-full bg-leaf-300/30" />
          <h2 className="relative section-title text-leaf-950">
            Keep your area <span className="accent-serif text-leaf-700">clean together</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-lg text-leaf-950/80">
            Report a problem in a few taps, then follow it to the end.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/report/new"
              className="inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-primary px-7 font-semibold text-primary-foreground transition-[transform,background-color] hover:bg-leaf-800 active:scale-[0.97] sm:w-auto"
            >
              <Camera className="size-5" aria-hidden /> Report an issue
            </Link>
            <Link
              href="/signup"
              className="group inline-flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-white px-7 font-semibold text-leaf-900 transition-transform active:scale-[0.97] sm:w-auto"
            >
              Create an account
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </Reveal>

        <div className="flex flex-col gap-8 py-12 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <Logo className="w-[200px] lg:w-[220px]" />
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-2 gap-y-1">
              {[
                ["/awareness", "Awareness"],
                ["/report/new", "Report an issue"],
                ["/pickup/new", "Request a pickup"],
                ["/login", "Log in"],
                ["/signup", "Sign up"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-ui font-medium text-leaf-950/80 hover:bg-leaf-50 hover:text-leaf-900"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="border-t border-leaf-100 py-6 text-sm text-muted-foreground">
          Working prototype. Organisations, people, places and cases shown are sample data, not a live municipal
          service.
        </p>
      </div>
    </footer>
  );
}
