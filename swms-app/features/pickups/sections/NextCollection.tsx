// "Next collection in your area" on the resident home (03 F12.3).

import { CalendarClock } from "lucide-react";
import { ORG_TIME_ZONE } from "@/lib/time";
import type { NextCollection as Next } from "../server";

const WASTE: Record<string, string> = { mixed: "mixed waste", wet: "wet waste", dry: "dry waste" };

function dayLabel(date: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: ORG_TIME_ZONE }).format(new Date());
  const days = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(date));
}

const clock = (hhmm: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(`1970-01-01T${hhmm}:00Z`));

export function NextCollection({ next }: { next: Next | null }) {
  return (
    <section aria-labelledby="next-collection-title" className="flex items-start gap-4 rounded-[1.75rem] border border-leaf-200 bg-white p-5">
      <CalendarClock className="mt-0.5 size-6 shrink-0 text-leaf-700" aria-hidden />
      <div>
        <h2 id="next-collection-title" className="text-lg font-bold text-leaf-950">Next collection in your area</h2>
        {next ? (
          <p className="mt-1 text-ui text-leaf-950/85">
            <strong>{dayLabel(next.date)}</strong>, {clock(next.start)} to {clock(next.end)} · {WASTE[next.wasteType] ?? next.wasteType}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No routine collection is scheduled for your area yet. You can still request a pickup.</p>
        )}
      </div>
    </section>
  );
}
