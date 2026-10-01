"use client";

// Admin review tools on /case/[id] (03 F5.3): reject a submitted report, close a reviewed or disputed
// case with a reason, correct a wrong issue type. The database functions re-check role and status.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReasonForm } from "@/components/shared/ReasonForm";
import { Button } from "@/components/ui/button";
import { ISSUE_TYPE_LABEL } from "@/features/staff";
import type { IssueType, ReportStatus } from "@/types/domain";
import { closeReport, correctIssueType, rejectReport } from "../actions";

export function ReviewPanel({ reportId, status, issueType }: { reportId: string; status: ReportStatus; issueType: string }) {
  const canReject = status === "submitted";
  const canClose = status === "awaiting_review" || status === "disputed";

  return (
    <section aria-labelledby="review-title" className="flex flex-col gap-6 rounded-2xl border bg-card p-5">
      <h2 id="review-title" className="text-lg font-bold text-leaf-950">
        Review this case
      </h2>

      {canClose && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-leaf-950">Close the case</h3>
          <ReasonForm
            label="Reason for closing"
            hint="Shown on the timeline."
            submitLabel="Close case"
            doneMessage="Case closed."
            onSubmit={(reason, extra) => closeReport({ reportId, reason, valid: extra.get("valid") === "on" })}
          >
            <label className="flex min-h-11 items-center gap-2 text-ui text-leaf-950">
              <input type="checkbox" name="valid" defaultChecked className="size-4 accent-leaf-700" />
              The report was valid (counts for the reporter&apos;s points)
            </label>
          </ReasonForm>
        </div>
      )}

      {canReject && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-leaf-950">Reject the report</h3>
          <ReasonForm
            label="Reason (invalid, duplicate or out of area)"
            hint="The reporter is notified and sees this reason."
            submitLabel="Reject report"
            doneMessage="Report rejected."
            tone="danger"
            onSubmit={(reason) => rejectReport({ reportId, reason })}
          />
        </div>
      )}

      <CorrectType reportId={reportId} current={issueType} />
    </section>
  );
}

function CorrectType({ reportId, current }: { reportId: string; current: string }) {
  const router = useRouter();
  const [value, setValue] = useState(current as IssueType);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  async function save() {
    if (pending || value === current) return;
    setPending(true);
    setMessage(undefined);
    try {
      const result = await correctIssueType({ reportId, issueType: value });
      setMessage(result.ok ? { ok: true, text: "Issue type corrected. The due time was recalculated." } : { ok: false, text: result.message });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, text: "Could not save. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold text-leaf-950">Correct the issue type</h3>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="issue-type" className="text-sm font-medium text-leaf-950">
            Issue type
          </label>
          <select
            id="issue-type"
            value={value}
            onChange={(e) => setValue(e.target.value as IssueType)}
            className="h-11 rounded-lg border border-input bg-card px-3 text-ui outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Object.entries(ISSUE_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={save} disabled={pending || value === current} className="h-11 px-5">
          {pending ? "Saving…" : "Save type"}
        </Button>
      </div>
      <p role="status" className={message?.ok ? "text-sm text-success" : "text-sm text-danger"}>
        {message?.text}
      </p>
    </div>
  );
}
