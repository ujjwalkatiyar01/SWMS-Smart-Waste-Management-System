"use client";

// A short form with one required text field and a button, for actions that need a reason
// (reject, close, return, reopen, instruction, delay note). Extra controls go in `children`.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionOutcome } from "@/lib/validation/result";

export function ReasonForm({
  label,
  hint,
  submitLabel,
  doneMessage,
  tone = "primary",
  onSubmit,
  doneLink,
  children,
}: {
  label: string;
  hint?: string;
  submitLabel: string;
  doneMessage: string;
  tone?: "primary" | "danger";
  onSubmit: (reason: string, extra: FormData) => Promise<ActionOutcome>;
  /** When the action removes the viewer's access to this page: show this link instead of refreshing into "not found". */
  doneLink?: { href: string; label: string };
  children?: ReactNode;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const extra = new FormData(event.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const result = await onSubmit(reason, extra);
      if (result.ok) {
        setDone(true);
        setReason("");
        if (!doneLink) router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Could not send. Check your connection and try again — your text is kept.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2">
        <p role="status" className="flex items-center gap-2 text-ui font-semibold text-success">
          <CheckCircle2 className="size-5" aria-hidden /> {doneMessage}
        </p>
        {doneLink && (
          <Link href={doneLink.href} className="inline-flex min-h-11 items-center self-start font-semibold text-leaf-800 underline underline-offset-4">
            {doneLink.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-semibold text-leaf-950">
          {label}
        </label>
        <textarea
          id={fieldId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          maxLength={1000}
          required
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
          className="rounded-2xl border border-leaf-900/15 bg-white px-4 py-3 text-base text-leaf-950 outline-none focus:ring-2 focus:ring-leaf-600"
        />
        {hint && (
          <p id={`${fieldId}-hint`} className="text-sm text-leaf-950/70">
            {hint}
          </p>
        )}
      </div>
      {children}
      <div role="alert">{error && <p className="text-sm font-medium text-danger">{error}</p>}</div>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full px-5 text-ui font-semibold transition-[transform,background-color] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70",
          tone === "danger"
            ? "border border-danger/30 bg-white text-danger hover:bg-danger-soft"
            : "bg-primary text-primary-foreground hover:bg-leaf-800",
        )}
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {submitLabel}
      </button>
    </form>
  );
}
