"use client";

import { useActionState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assignReport } from "../actions";

export function AssignForm({
  reportId,
  workers,
  currentWorkerId,
  onAssigned,
}: {
  reportId: string;
  workers: { id: string; name: string }[];
  currentWorkerId: string | null;
  onAssigned?: () => void;
}) {
  const [result, action, pending] = useActionState(assignReport, null);
  const selectId = useId();
  const router = useRouter();

  useEffect(() => {
    if (!result?.ok) return;
    router.refresh();
    onAssigned?.();
  }, [result, router, onAssigned]);

  if (workers.length === 0) {
    return <p className="text-sm text-muted-foreground">No active workers in this organisation yet.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="reportId" value={reportId} />
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-leaf-950">
          {currentWorkerId ? "Reassign to" : "Assign to"}
        </label>
        <select
          key={currentWorkerId ?? "none"}
          id={selectId}
          name="workerId"
          required
          defaultValue={currentWorkerId ?? ""}
          className="h-11 rounded-lg border border-input bg-card px-3 text-ui outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Choose a worker
          </option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="h-11 px-5">
        {pending ? "Saving…" : currentWorkerId ? "Reassign" : "Assign"}
      </Button>
      <p aria-live="polite" className={result?.ok ? "text-sm text-success" : "text-sm text-danger"}>
        {result?.message}
      </p>
    </form>
  );
}
