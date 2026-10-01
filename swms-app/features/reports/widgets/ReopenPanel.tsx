"use client";

// Reopen a closed case inside the reopen window (03 F4.7). Later problems are new reports.

import { ReasonForm } from "@/components/shared/ReasonForm";
import { reopenReport } from "../actions";

export function ReopenPanel({ reportId }: { reportId: string }) {
  return (
    <section aria-labelledby="reopen-title" className="rounded-2xl border bg-card p-5">
      <h2 id="reopen-title" className="text-lg font-bold text-leaf-950">
        Problem came back?
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">You can reopen this case for a few days after it was closed.</p>
      <ReasonForm
        label="What is still wrong?"
        submitLabel="Reopen case"
        doneMessage="Case reopened. The admin has been told."
        tone="danger"
        onSubmit={(reason) => reopenReport({ reportId, reason })}
      />
    </section>
  );
}
