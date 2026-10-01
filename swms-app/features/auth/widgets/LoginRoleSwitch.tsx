"use client";

// "Who are you?" on the login pages: each choice opens its own login form.

import Link from "next/link";
import { HardHat, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoginRole = "resident" | "worker" | "admin";

const ROLES = [
  { value: "resident", href: "/login", label: "Resident", icon: UserRound },
  { value: "worker", href: "/login/worker", label: "Worker", icon: HardHat },
  { value: "admin", href: "/login?as=admin", label: "Administrator", icon: ShieldCheck },
] as const;

export function LoginRoleSwitch({ active }: { active: LoginRole | null }) {
  return (
    <nav aria-label="Who are you?" className="mt-5">
      <p className="mb-1.5 text-sm font-semibold text-leaf-950">Who are you?</p>
      <div className="grid grid-cols-3 gap-2">
        {ROLES.map(({ value, href, label, icon: Icon }) => (
          <Link
            key={value}
            href={href}
            replace
            aria-current={value === active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-sm font-semibold transition-colors",
              value === active ? "border-leaf-700 bg-leaf-50 text-leaf-900" : "border-leaf-900/15 bg-white text-leaf-950/70 hover:bg-leaf-50",
            )}
          >
            <Icon className="size-5" aria-hidden /> {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
