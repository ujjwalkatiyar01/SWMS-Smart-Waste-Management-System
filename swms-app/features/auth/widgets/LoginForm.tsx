"use client";

// Login form (03 F1.2): "Who are you?" first. Residents log in with email + password; administrators also
// give their staff ID (checked against their account, 0800); workers use /login/worker. Supervisors and the
// higher authority use the plain staff login (`?as=staff`). The role in the database decides the dashboard.

import Link from "next/link";
import { IdCard, Mail } from "lucide-react";
import { adminLogin, login } from "../actions";
import { INACTIVE_MESSAGE } from "../schema";
import { FormAlert, PasswordField, TextField } from "./fields";
import { LoginRoleSwitch } from "./LoginRoleSwitch";
import { SubmitButton } from "./SubmitButton";
import { useAuthForm } from "./useAuthForm";

export type LoginAudience = "resident" | "admin" | "staff";

const COPY: Record<LoginAudience, { title: string; accent: string; lead: string; submit: string }> = {
  resident: { title: "Welcome ", accent: "back", lead: "Spot a problem. Follow the fix.", submit: "Log in" },
  admin: { title: "Administrator ", accent: "login", lead: "Log in with the staff ID your organisation listed for you.", submit: "Log in to dashboard" },
  staff: { title: "Staff ", accent: "login", lead: "Supervisors and higher authority. Your dashboard opens for your role.", submit: "Log in to dashboard" },
};

/** `inactive`: the session ended because the account was deactivated (04-AUTH §3 check 2). */
export function LoginForm({ inactive = false, audience = "resident" }: { inactive?: boolean; audience?: LoginAudience }) {
  const admin = audience === "admin";
  const { pending, errors, message, formProps } = useAuthForm<"email" | "password" | "staffId">((data) => {
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    return admin ? adminLogin({ email, password, staffId: String(data.get("staffId") ?? "") }) : login({ email, password });
  });
  const copy = COPY[audience];

  return (
    <div className="animate-enter">
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
        {copy.title}
        <span className="accent-serif text-leaf-700">{copy.accent}</span>
      </h1>
      <p className="mt-1.5 text-ui text-leaf-950/80">{copy.lead}</p>

      <LoginRoleSwitch active={audience === "staff" ? null : audience} />

      <form {...formProps} className="mt-5 flex flex-col gap-4">
        {admin && (
          <TextField id="staffId" label="Staff ID" icon={IdCard} autoComplete="username" autoCapitalize="characters"
            placeholder="e.g. CWA-ADM-001" maxLength={40} required error={errors.staffId} />
        )}
        <TextField
          id="email"
          label={audience === "resident" ? "Email" : "Work email"}
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={audience === "resident" ? "you@example.com" : "name@organisation.org"}
          required
          error={errors.email}
        />
        <PasswordField id="password" label="Password" autoComplete="current-password" required error={errors.password} />
        <Link href="/reset-password" className="self-end text-sm font-semibold text-leaf-800 underline-offset-4 hover:underline">Forgot password?</Link>
        <FormAlert message={message ?? (inactive ? INACTIVE_MESSAGE : undefined)} />
        <SubmitButton pending={pending} label={copy.submit} pendingLabel="Logging in…" />
      </form>

      {audience === "resident" ? (
        <p className="mt-5 text-center text-ui text-leaf-950/80">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">Create an account</Link>
        </p>
      ) : (
        <p className="mt-5 text-center text-sm text-leaf-950/70">
          New staff sign up with the staff ID their admin listed.{" "}
          <Link href="/signup" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">Sign up</Link>
        </p>
      )}
      {audience !== "staff" && (
        <p className="mt-2 text-center text-sm text-leaf-950/70">
          Supervisor or higher authority?{" "}
          <Link href="/login?as=staff" className="font-semibold text-leaf-800 underline-offset-4 hover:underline">Log in here</Link>
        </p>
      )}
    </div>
  );
}
