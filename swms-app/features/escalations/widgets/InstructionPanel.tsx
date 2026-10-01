"use client";

// Supervisor or higher authority adds an instruction to an open case (03 F5.2); they cannot close it.

import { ReasonForm } from "@/components/shared/ReasonForm";
import { addInstruction } from "../actions";

export function InstructionPanel({ reportId }: { reportId: string }) {
  return (
    <section aria-labelledby="instruction-title" className="rounded-2xl border bg-card p-5">
      <h2 id="instruction-title" className="text-lg font-bold text-leaf-950">
        Add an instruction
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">The admin and the assigned worker are notified.</p>
      <ReasonForm
        label="Instruction"
        submitLabel="Send instruction"
        doneMessage="Instruction sent."
        onSubmit={(note) => addInstruction({ reportId, note })}
      />
    </section>
  );
}
