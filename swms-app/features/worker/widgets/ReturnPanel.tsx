"use client";

// "Can't do this task" on the case page (03 F4.5): the assigned worker gives the task back with a reason.

import { ReasonForm } from "@/components/shared/ReasonForm";
import { returnTask } from "../actions";

export function ReturnPanel({ reportId }: { reportId: string }) {
  return (
    <section aria-labelledby="return-title" className="rounded-2xl border bg-card p-5">
      <h2 id="return-title" className="text-lg font-bold text-leaf-950">
        Can&apos;t do this task?
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">Give it back to the admin. The due time does not change.</p>
      <ReasonForm
        label="Reason (site blocked, needs equipment, wrong location…)"
        submitLabel="Return task"
        doneMessage="Task returned to the admin."
        tone="danger"
        onSubmit={(reason) => returnTask({ reportId, reason })}
      />
    </section>
  );
}
