"use client";

// Why an overdue case is late and what happens next (R5), for the admin or the assigned worker.

import { ReasonForm } from "@/components/shared/ReasonForm";
import { addDelayNote } from "../actions";

export function DelayNotePanel({ reportId }: { reportId: string }) {
  return (
    <section aria-labelledby="delay-title" className="rounded-2xl border border-warning-line bg-warning-soft p-5">
      <h2 id="delay-title" className="text-lg font-bold text-warning">
        This case is overdue
      </h2>
      <p className="mb-4 mt-1 text-sm text-warning">Record why, and what happens next. The due time does not change.</p>
      <ReasonForm
        label="Why is it late?"
        submitLabel="Save delay note"
        doneMessage="Delay note saved."
        onSubmit={(reason, extra) => addDelayNote({ reportId, reason, nextStep: String(extra.get("nextStep") ?? "") })}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="next-step" className="text-sm font-semibold text-leaf-950">
            Next step
          </label>
          <input
            id="next-step"
            name="nextStep"
            required
            maxLength={1000}
            className="h-11 rounded-2xl border border-leaf-900/15 bg-white px-4 text-base text-leaf-950 outline-none focus:ring-2 focus:ring-leaf-600"
          />
        </div>
      </ReasonForm>
    </section>
  );
}
