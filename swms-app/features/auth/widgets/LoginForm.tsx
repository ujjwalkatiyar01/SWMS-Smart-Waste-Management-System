"use client";

// Login form (03 F1.2): email + password → role home. One login for every role; the Resident / Staff
// switch only changes the wording — the role stored in the database decides which dashboard opens.

import Link from "next/link";
import { BriefcaseBusiness, Mail, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { login } from "../actions";
import { INACTIVE_MESSAGE } from "../schema";
import { FormAlert, PasswordField, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

export type LoginAudience = "resident" | "staff";

const AUDIENCES = [
  { value: "resident", href: "/login", label: "Resident", icon: UserRound },
  { value: "staff", href: "/login?as=staff", label: "Staff", icon: BriefcaseBusiness },
] as const;

const STAFF_HOMES = ["Admin → dashboard", "Worker / Driver → tasks", "Supervisor → escalations", "Higher authority → summary"];

/** `inactive`: the session ended because the account was deactivated (04-AUTH §3 check 2). */
export function LoginForm({ inactive = false, audience = "resident" }: { inactive?: boolean; audience?: LoginAudience }) {
  const { pending, errors, message, formProps } = useAuthForm((data) =>
    login({ email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") }),
  );
  const staff = audience === "staff";

  return (
    <div className="animate-enter">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
        {staff ? "Staff " : "Welcome "}
        <span className="accent-serif text-leaf-700">{staff ? "login" : "back"}</span>
      </h1>
      <p className="mt-1.5 text-ui text-leaf-950/80">
        {staff ? "Your dashboard opens for your role." : "Spot a problem. Follow the fix."}
      </p>

      <nav aria-label="Who is logging in" className="mt-5 grid grid-cols-2 gap-2">
        {AUDIENCES.map(({ value, href, label, icon: Icon }) => (
          <Link
            key={value}
            href={href}
            replace
            aria-current={value === audience ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border text-ui font-semibold transition-colors",
              value === audience
                ? "border-leaf-700 bg-leaf-50 text-leaf-900"
                : "border-leaf-900/15 bg-white text-leaf-950/70 hover:bg-leaf-50",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
      {staff && (
        <ul aria-label="Where you land" className="mt-3 flex flex-wrap gap-1.5">
          {STAFF_HOMES.map((h) => (
            <li key={h} className="rounded-full bg-leaf-50 px-3 py-1 text-sm text-leaf-900">
              {h}
            </li>
          ))}
        </ul>
      )}

      <form {...formProps} className="mt-5 flex flex-col gap-4">
        <TextField
          id="email"
          label={staff ? "Work email" : "Email"}
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={staff ? "name@organisation.org" : "you@example.com"}
          required
          error={errors.email}
        />
        <PasswordField id="password" label="Password" autoComplete="current-password" required error={errors.password} />
        <Link href="/reset-password" className="self-end text-sm font-semibold text-leaf-800 underline-offset-4 hover:underline">Forgot password?</Link>
        <FormAlert message={message ?? (inactive ? INACTIVE_MESSAGE : undefined)} />
        <SubmitButton pending={pending} label={staff ? "Log in to dashboard" : "Log in"} pendingLabel="Logging in…" />
      </form>

      {staff ? (
        <>
          <p className="mt-5 text-center text-ui text-leaf-950/80">
            Worker or driver?{" "}
            <Link href="/login/worker" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">Use worker login</Link>{" "}
            with your staff ID and work area.
          </p>
          <p className="mt-2 text-center text-sm text-leaf-950/70">New staff sign up with the staff ID their admin listed in Setup → Staff IDs.</p>
        </>
      ) : (
        <p className="mt-5 text-center text-ui text-leaf-950/80">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">
            Create a resident account
          </Link>
        </p>
      )}
    </div>
  );
}
