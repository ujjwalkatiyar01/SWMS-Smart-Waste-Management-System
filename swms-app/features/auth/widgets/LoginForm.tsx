"use client";

// Login form (03 F1.2): email + password → role home.

import Link from "next/link";
import { Mail } from "lucide-react";
import { login } from "../actions";
import { INACTIVE_MESSAGE } from "../schema";
import { FormAlert, PasswordField, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

/** `inactive`: the session ended because the account was deactivated (04-AUTH §3 check 2). */
export function LoginForm({ inactive = false }: { inactive?: boolean }) {
  const { pending, errors, message, formProps } = useAuthForm((data) =>
    login({ email: String(data.get("email") ?? ""), password: String(data.get("password") ?? "") }),
  );

  return (
    <div className="animate-enter">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
        Welcome <span className="accent-serif text-leaf-700">back</span>
      </h1>
      <p className="mt-1.5 text-ui text-leaf-950/80">Spot a problem. Follow the fix.</p>

      <form {...formProps} className="mt-6 flex flex-col gap-4">
        <TextField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          error={errors.email}
        />
        <PasswordField id="password" label="Password" autoComplete="current-password" required error={errors.password} />
        <Link href="/reset-password" className="self-end text-sm font-semibold text-leaf-800 underline-offset-4 hover:underline">Forgot password?</Link>
        <FormAlert message={message ?? (inactive ? INACTIVE_MESSAGE : undefined)} />
        <SubmitButton pending={pending} label="Log in" pendingLabel="Logging in…" />
      </form>

      <p className="mt-5 text-center text-ui text-leaf-950/80">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">
          Create a resident account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-leaf-950/70">Staff accounts are created by your organisation&apos;s admin.</p>
    </div>
  );
}
