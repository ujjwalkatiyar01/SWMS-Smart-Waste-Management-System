// Resident home /my (03 F8, F4): my reports with status and due time, the main "Report an issue"
// action and a link to the segregation guide.

import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Camera, ChevronRight, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PickupList } from "@/features/pickups";
import type { PickupListItem } from "@/features/pickups/schema";
import { formatDateTime, relative } from "@/lib/time";
import { isFinished, issueLabel } from "../content/labels";
import type { FollowedCase, MyReport } from "../schema";

export function MyReports({
  firstName,
  reports,
  pickups,
  followed = [],
  aboveLists,
}: {
  firstName: string;
  reports: MyReport[];
  pickups: PickupListItem[];
  followed?: FollowedCase[];
  /** Cards shown under the greeting, such as the next collection and rewards. */
  aboveLists?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-[1.75rem] bg-lime-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="eyebrow text-leaf-800">My reports</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
            Hello, <span className="accent-serif text-leaf-700">{firstName}</span>
          </h1>
          <p className="mt-1 text-ui text-leaf-950/80">Spotted a problem? Report it and follow the fix.</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Link
            href="/report/new"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-cta transition-[transform,background-color] hover:bg-leaf-800 active:scale-[0.98]"
          >
            <Camera className="size-5" aria-hidden /> Report an issue
          </Link>
          <Link
            href="/awareness"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-ui font-semibold text-leaf-900 hover:bg-white/60"
          >
            <BookOpen className="size-4" aria-hidden /> Segregation guide
          </Link>
        </div>
      </section>

      {aboveLists}

      <PickupList pickups={pickups} />

      <section aria-labelledby="my-reports-title">
        <h2 id="my-reports-title" className="text-xl font-bold text-leaf-950">
          Reports I sent
        </h2>
        {reports.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-leaf-300 bg-white px-6 py-10 text-center">
            <Inbox className="size-8 text-leaf-600" aria-hidden />
            <p className="text-ui font-semibold text-leaf-950">No reports yet</p>
            <p className="text-sm text-muted-foreground">When you report a problem, you can follow it here until it is fixed.</p>
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/case/${r.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-leaf-900/10 bg-white p-4 transition-colors hover:bg-leaf-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-ui font-semibold text-leaf-950">{issueLabel(r.issueType)}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {r.placeName ?? "Phone GPS location"} · sent {formatDateTime(r.createdAt)}
                      {!isFinished(r.status) && ` · due ${relative(r.dueAt)}`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-leaf-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {followed.length > 0 && (
        <section aria-labelledby="followed-title">
          <h2 id="followed-title" className="text-xl font-bold text-leaf-950">
            Cases I follow
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">You get updates on these. You see a summary only.</p>
          <ul className="mt-4 flex flex-col gap-3">
            {followed.map((c) => (
              <li key={c.id}>
                <Link href={`/case/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-leaf-900/10 bg-white p-4 transition-colors hover:bg-leaf-50">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-ui font-semibold text-leaf-950">{issueLabel(c.issueType)}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {c.placeName ?? "Phone GPS location"}
                      {!isFinished(c.status) && ` · due ${relative(c.dueAt)}`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-leaf-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
