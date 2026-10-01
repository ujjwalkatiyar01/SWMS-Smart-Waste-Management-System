"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import type { SetupResult } from "../actions";

export function SetupForm({ action, children, submitLabel, className = "" }: {
  action: (form: FormData) => Promise<SetupResult>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const answer = await action(new FormData(event.currentTarget));
      setResult(answer);
      if (answer.ok) router.refresh();
    } catch { setResult({ ok: false, message: "Could not save. Check your connection and try again." }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className={className}>
    {children}
    <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-leaf-800 disabled:opacity-60">
      {busy ? "Saving…" : submitLabel}
    </button>
    {result && <p role="status" className={`text-sm font-medium ${result.ok ? "text-leaf-800" : "text-danger"}`}>{result.message}</p>}
  </form>;
}
