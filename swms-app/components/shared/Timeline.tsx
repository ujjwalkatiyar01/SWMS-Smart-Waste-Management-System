// Case timeline (03 F4): one row per report_events entry — what happened, who, when (organisation time), note.

import { formatDateTime } from "@/lib/time";

export interface TimelineEvent {
  id: string;
  /** report_events.type, e.g. created, assigned, completed, feedback */
  type: string;
  /** report_events.created_at (ISO) */
  at: string;
  /** Display name of the actor, e.g. "Priya", "Staff" or "System"; empty when names are hidden (P1 summary) */
  actor: string;
  note?: string | null;
  /** Short-lived signed link for an evidence or reopening photo (full case view only). */
  photoUrl?: string | null;
}

const EVENT_LABEL: Record<string, string> = {
  created: "Reported",
  edited: "Edited",
  cancelled: "Cancelled",
  rejected: "Rejected",
  assigned: "Assigned",
  type_changed: "Issue type corrected",
  category_changed: "Waste category corrected",
  completed: "Work completed",
  returned: "Returned by worker",
  feedback: "Feedback given",
  closed: "Closed",
  disputed: "Disputed",
  reopened: "Reopened",
  overdue: "Overdue",
  escalated: "Escalated to supervisor",
  escalated_l2: "Escalated to higher authority",
  instruction: "Instruction added",
  no_reply: "No response",
  evidence_added: "Evidence added",
  delay_note: "Delay reason added",
};

function eventLabel(type: string) {
  return EVENT_LABEL[type] ?? type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-ui text-muted-foreground">No updates yet.</p>;
  }
  return (
    <ol className="relative flex flex-col gap-5 border-l-2 border-leaf-100 pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span aria-hidden className="absolute -left-[1.95rem] top-1 size-3.5 rounded-full border-2 border-white bg-leaf-600 ring-2 ring-leaf-100" />
          <p className="text-ui font-semibold text-leaf-950">{eventLabel(e.type)}</p>
          <p className="text-sm text-muted-foreground">
            {e.actor && `${e.actor} · `}
            <time dateTime={e.at}>{formatDateTime(e.at)}</time>
          </p>
          {e.note && <p className="mt-1 text-ui text-leaf-950/80">{e.note}</p>}
          {e.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link from private storage
            <img src={e.photoUrl} alt={`${eventLabel(e.type)} photo`} className="mt-2 h-32 w-auto rounded-xl object-cover ring-1 ring-leaf-900/10" />
          )}
        </li>
      ))}
    </ol>
  );
}
