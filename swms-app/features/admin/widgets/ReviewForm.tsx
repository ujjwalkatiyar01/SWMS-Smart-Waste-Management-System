"use client";

// New prevention review for a place (02-PRD F5): suspected cause, action, owner, review date.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createPreventionReview } from "../actions";
import { PREVENTION_ACTIONS, type ReviewField, type ReviewInput } from "../schema";

const field =
  "rounded-2xl border border-leaf-900/15 bg-white px-4 py-3 text-base text-leaf-950 outline-none focus:ring-2 focus:ring-leaf-600 aria-invalid:ring-2 aria-invalid:ring-danger";

export function ReviewForm({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Partial<Record<ReviewField, string>>>({});
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setMessage(undefined);
    try {
      const result = await createPreventionReview({
        locationId,
        cause: String(data.get("cause") ?? ""),
        action: String(data.get("action") ?? "") as ReviewInput["action"],
        detail: String(data.get("detail") ?? ""),
        owner: String(data.get("owner") ?? ""),
        reviewDate: String(data.get("reviewDate") ?? ""),
      });
      if (result.ok) {
        setErrors({});
        setVersion((v) => v + 1); // clears the form
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
      }
    } catch {
      setMessage("Could not save. Check your connection and try again — your details are kept.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form key={version} onSubmit={submit} noValidate className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
      <Labelled id="cause" label="Suspected cause" error={errors.cause} wide>
        <textarea id="cause" name="cause" rows={2} maxLength={1000} aria-invalid={errors.cause ? true : undefined} className={field} />
      </Labelled>
      <Labelled id="action" label="Action" error={errors.action}>
        <select id="action" name="action" defaultValue="" aria-invalid={errors.action ? true : undefined} className={field}>
          <option value="" disabled>
            Choose…
          </option>
          {PREVENTION_ACTIONS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </Labelled>
      <Labelled id="detail" label="Details (optional)" error={errors.detail}>
        <input id="detail" name="detail" maxLength={600} className={field} />
      </Labelled>
      <Labelled id="owner" label="Owner" error={errors.owner}>
        <input id="owner" name="owner" maxLength={100} aria-invalid={errors.owner ? true : undefined} className={field} />
      </Labelled>
      <Labelled id="reviewDate" label="Review date" error={errors.reviewDate}>
        <input id="reviewDate" name="reviewDate" type="date" aria-invalid={errors.reviewDate ? true : undefined} className={field} />
      </Labelled>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <div role="alert">{message && <p className="text-sm font-medium text-danger">{message}</p>}</div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800 disabled:cursor-wait disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save review
        </button>
      </div>
    </form>
  );
}

function Labelled({ id, label, error, wide, children }: { id: string; label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "flex flex-col gap-1.5 sm:col-span-2" : "flex flex-col gap-1.5"}>
      <label htmlFor={id} className="text-sm font-semibold text-leaf-950">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
