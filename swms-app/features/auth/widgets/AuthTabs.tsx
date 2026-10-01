"use client";

// Log in / Sign up switch. Each tab is its own URL; the pill slides between them.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
] as const;

export function AuthTabs() {
  const pathname = usePathname();
  const active = Math.max(0, TABS.findIndex((t) => t.href === pathname));

  return (
    <nav aria-label="Account" className="relative grid grid-cols-2 rounded-full bg-white/25 p-1 ring-1 ring-white/60 backdrop-blur-md">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white/85 shadow-float transition-transform duration-500 ease-[var(--ease-spring)]"
        style={{ transform: `translateX(${active * 100}%)` }}
      />
      {TABS.map((t, i) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={i === active ? "page" : undefined}
          className={cn(
            "relative z-10 flex h-11 items-center justify-center rounded-full text-ui font-semibold transition-colors duration-300",
            i === active ? "text-leaf-900" : "text-leaf-950/70 hover:text-leaf-950",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
