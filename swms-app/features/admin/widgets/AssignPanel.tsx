"use client";

// Assign / reassign on the case page (03 F4.1, F4.7): mounted by /case/[id] for admins and supervisors.
// Shows nothing when the case is in a status that cannot be assigned.

import { useCallback, useEffect, useState } from "react";
import { getAssignOptions } from "../actions";
import type { AssignOptions } from "../schema";
import { AssignForm } from "./AssignForm";

export function AssignPanel({ reportId }: { reportId: string }) {
  const [options, setOptions] = useState<AssignOptions | null | "loading" | "error">("loading");

  const load = useCallback(() => {
    getAssignOptions(reportId).then(setOptions, () => setOptions("error"));
  }, [reportId]);

  useEffect(load, [load]);

  if (options === "loading") return <p className="text-sm text-muted-foreground">Loading workers…</p>;
  if (options === "error") return <p className="text-sm text-danger">Could not load workers. Refresh the page.</p>;
  if (!options) return null;

  return (
    <section aria-labelledby="assign-title" className="rounded-2xl border bg-card p-5">
      <h2 id="assign-title" className="text-lg font-bold text-leaf-950">
        {options.currentWorkerId ? "Reassign worker" : "Assign a worker"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">The due time stays the same when a case is reassigned.</p>
      <div className="mt-4">
        <AssignForm reportId={reportId} workers={options.workers} currentWorkerId={options.currentWorkerId} onAssigned={load} />
      </div>
    </section>
  );
}
