// Duty status with text and colour (colour never carries the meaning alone).

import { cn } from "@/lib/utils";
import type { DutyStatus } from "../schema";

const LOOK: Record<DutyStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-leaf-100 text-leaf-900" },
  in_progress: { label: "In progress", className: "bg-warning-soft text-warning" },
  done: { label: "Done", className: "bg-success-soft text-success" },
  missed: { label: "Missed", className: "bg-danger-soft text-danger" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export function DutyStatusBadge({ status }: { status: DutyStatus }) {
  const look = LOOK[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", look.className)}>{look.label}</span>;
}
