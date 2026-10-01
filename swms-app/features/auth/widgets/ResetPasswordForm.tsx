"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "../actions";

export function ResetPasswordForm({ expired = false }: { expired?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(expired ? "This link has expired. Request a new one." : "");
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setBusy(true);
    try {
      const result = await requestPasswordReset(email);
      setSuccess(result.ok);
      setMessage(result.message);
    } catch { setMessage("Could not send the link. Try again."); }
    finally { setBusy(false); }
  }
  return <div>
    <h1 className="text-3xl font-extrabold text-leaf-950">Reset your password</h1>
    <p className="mt-2 text-ui text-leaf-950/80">Enter your account email. We&apos;ll send a reset link.</p>
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold text-leaf-950">Email
        <input type="email" name="email" autoComplete="email" required className="h-12 rounded-xl border border-leaf-300 bg-white px-4 text-base" />
      </label>
      {message && <p role="status" className={success ? "text-sm text-leaf-800" : "text-sm text-danger"}>{message}</p>}
      <button disabled={busy} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-leaf-800 disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button>
    </form>
    <Link href="/login" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-leaf-800 underline">Back to log in</Link>
  </div>;
}
