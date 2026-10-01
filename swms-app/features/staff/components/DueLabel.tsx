import { formatDateTime, hoursOverdue } from "@/lib/time";
import { isOverdueStatus } from "../content/labels";

// Due time in the organisation's time zone; "Overdue by Xh" only for statuses that can be overdue (03 F5.1).
export function DueLabel({ dueAt, status }: { dueAt: string; status: string }) {
  const late = isOverdueStatus(status) ? hoursOverdue(dueAt) : 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Due {formatDateTime(dueAt)}</span>
      {late > 0 && (
        <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
          Overdue by {late}h
        </span>
      )}
    </span>
  );
}
