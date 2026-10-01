"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { updatePassword } from "../actions";

export function UpdatePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password !== String(data.get("confirm") ?? "")) { setMessage("Passwords do not match."); return; }
    setBusy(true);
    try {
      const result = await updatePassword(password);
      setSuccess(result.ok);
      setMessage(result.message);
    } catch { setMessage("Could not update your password. Try again."); }
    finally { setBusy(false); }
  }
  return <div>
    <h1 className="text-3xl font-extrabold text-leaf-950">Choose a new password</h1>
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold text-leaf-950">New password
        <input type="password" name="password" autoComplete="new-password" minLength={8} required className="h-12 rounded-xl border border-leaf-300 bg-white px-4 text-base" />
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-leaf-950">Confirm password
        <input type="password" name="confirm" autoComplete="new-password" minLength={8} required className="h-12 rounded-xl border border-leaf-300 bg-white px-4 text-base" />
      </label>
      {message && <p role="status" className={success ? "text-sm text-leaf-800" : "text-sm text-danger"}>{message}</p>}
      <button disabled={busy || success} className="min-h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-leaf-800 disabled:opacity-60">{busy ? "Saving…" : "Save password"}</button>
    </form>
    {success && <Link href="/my" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-leaf-800 underline">Continue to your account</Link>}
  </div>;
}
