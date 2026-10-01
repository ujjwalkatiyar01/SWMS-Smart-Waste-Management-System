"use client";

// Reporter's answer after the work is done (03 F4.6, F4.6b): Resolved / Partly / Not resolved,
// optional satisfaction (R2) and comment. Resolved closes the case; the others dispute it.

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { MascotDialog } from "@/components/shared/MascotDialog";
import type { FeedbackResult, Satisfaction } from "@/types/domain";
import { submitFeedback } from "../actions";
import { FEEDBACK_OPTIONS, SATISFACTION_OPTIONS } from "../content/labels";
import { ChoiceGroup } from "./ChoiceGroup";

export function FeedbackForm({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<FeedbackResult | null>(null);

  function closeDialog() {
    setSent(null);
    router.refresh();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!feedback) return setError("Choose one answer.");
    setPending(true);
    setError(undefined);
    try {
      const result = await submitFeedback({ reportId, feedback, satisfaction, comment });
      if (result.ok) setSent(feedback);
      else setError(result.message);
    } catch {
      setError("Could not send. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <ChoiceGroup
          name="feedback"
          legend="Is the problem fixed?"
          options={FEEDBACK_OPTIONS}
          value={feedback}
          onChange={setFeedback}
          error={error}
          columns={3}
        />
        <ChoiceGroup
          name="satisfaction"
          legend="How satisfied are you with the service?"
          options={SATISFACTION_OPTIONS}
          value={satisfaction}
          onChange={setSatisfaction}
          optional
          columns={3}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="comment" className="text-sm font-semibold text-leaf-950">
            Comment <span className="font-normal text-leaf-950/70">(optional)</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            className="rounded-2xl border border-leaf-900/15 bg-white px-4 py-3 text-base text-leaf-950 outline-none focus:ring-2 focus:ring-leaf-600"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-cta hover:bg-leaf-800 disabled:cursor-wait disabled:opacity-80 sm:self-start"
        >
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          {pending ? "Sending…" : "Send answer"}
        </button>
      </form>

      <MascotDialog
        open={sent !== null}
        onOpenChange={(open) => !open && closeDialog()}
        sign={sent === "resolved" ? ["THANK", "YOU!"] : ["WE'RE", "ON IT"]}
        title={sent === "resolved" ? "Thanks — case closed" : "Thanks — we'll look again"}
        description={
          sent === "resolved"
            ? "Glad it's fixed. You can see the full history on this page."
            : "Your answer has gone to the admin team, who will review the case."
        }
      >
        <button
          type="button"
          onClick={closeDialog}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-ui font-semibold text-primary-foreground hover:bg-leaf-800"
        >
          See the case
        </button>
      </MascotDialog>
    </>
  );
}
