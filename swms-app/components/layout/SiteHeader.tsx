"use client";

// ─────────────────────────────────────────────────────────────
// Layout · Site header (public pages)
// Sticky top bar: logo, main navigation, "Log in", "Report an issue",
// and the mobile menu. Becomes solid once the page is scrolled.
// Client component: scroll state, menu open/close, Escape key.
// Used by: app/(public)/page.tsx
// Uses:    shared/Logo, nav-links
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useState } from "react";
import { Leaf, LogIn, Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";
import { NAV } from "./nav-links";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow] duration-300",
        scrolled || open
          ? "bg-cream/90 shadow-[0_1px_0_var(--color-leaf-100)] backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <div className="flex items-center gap-3">
          <Logo preload />
        </div>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-full px-4 py-2.5 text-[15px] font-medium text-leaf-950/80 transition-colors hover:bg-leaf-100 hover:text-leaf-900"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-leaf-900 transition-colors hover:bg-leaf-100 sm:inline-flex"
          >
            <LogIn className="size-4" aria-hidden />
            Log in
          </Link>
          <Link
            href="/report/new"
            className="group hidden h-12 items-center gap-2.5 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(46,100,32,0.6)] transition-[transform,background-color] duration-200 hover:bg-leaf-800 active:scale-[0.97] md:inline-flex"
          >
            <Leaf className="size-4 transition-transform duration-300 group-hover:-rotate-12" aria-hidden />
            Report an issue
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-11 items-center justify-center rounded-full text-leaf-900 transition-colors hover:bg-leaf-100 active:scale-95 lg:hidden"
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-leaf-100 px-4 pb-6 pt-2 animate-pop lg:hidden">
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-leaf-950 active:bg-leaf-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center gap-2 rounded-lg px-3 text-base font-medium text-leaf-950 active:bg-leaf-100"
                >
                  <LogIn className="size-4" aria-hidden /> Log in
                </Link>
              </li>
            </ul>
          </nav>
          <Link
            href="/report/new"
            onClick={() => setOpen(false)}
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-primary-foreground active:scale-[0.98]"
          >
            <Leaf className="size-4" aria-hidden /> Report an issue
          </Link>
        </div>
      )}
    </header>
  );
}
