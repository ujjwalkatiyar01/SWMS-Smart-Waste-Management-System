// Report and pickup status badge: icon + text + colour, never colour alone (PRD §6 accessibility).

import {
  Ban,
  CalendarCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock,
  Hourglass,
  MessageSquareWarning,
  RotateCcw,
  Send,
  Undo2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PickupStatus, ReportStatus } from "@/types/domain";

type Tone = "neutral" | "progress" | "attention" | "done" | "stopped";

const STATUS: Record<ReportStatus | PickupStatus, { label: string; icon: LucideIcon; tone: Tone }> = {
  submitted: { label: "Submitted", icon: Send, tone: "attention" },
  assigned: { label: "Assigned", icon: UserCheck, tone: "progress" },
  returned: { label: "Returned", icon: Undo2, tone: "attention" },
  awaiting_review: { label: "Awaiting review", icon: Hourglass, tone: "progress" },
  disputed: { label: "Disputed", icon: MessageSquareWarning, tone: "attention" },
  closed: { label: "Closed", icon: CircleCheck, tone: "done" },
  reopened: { label: "Reopened", icon: RotateCcw, tone: "attention" },
  cancelled: { label: "Cancelled", icon: CircleDashed, tone: "neutral" },
  rejected: { label: "Rejected", icon: CircleX, tone: "stopped" },
  requested: { label: "Requested", icon: Clock, tone: "attention" },
  scheduled: { label: "Scheduled", icon: CalendarCheck, tone: "progress" },
  collected: { label: "Collected", icon: CircleCheck, tone: "done" },
  declined: { label: "Declined", icon: CircleX, tone: "stopped" },
  missed: { label: "Missed", icon: Clock, tone: "stopped" },
  refused: { label: "Refused", icon: Ban, tone: "stopped" },
};

const TONE: Record<Tone, string> = {
  neutral: "border-leaf-900/15 bg-muted text-muted-foreground",
  progress: "border-leaf-300 bg-leaf-50 text-leaf-800",
  attention: "border-warning-line bg-warning-soft text-warning",
  done: "border-success/30 bg-success-soft text-success",
  stopped: "border-danger/25 bg-danger-soft text-danger",
};

export function StatusBadge({ status, className }: { status: ReportStatus | PickupStatus; className?: string }) {
  const { label, icon: Icon, tone } = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold",
        TONE[tone],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
