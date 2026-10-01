// Supervisor home (02-PRD F5 supervisor dashboard, 03 F5.3, F8): escalated cases with reassign
// (assign_report), overdue by area and worker, service measures, prevention reviews (read-only).

import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AssignForm } from "@/features/admin";
import { DueLabel, EmptyState, ISSUE_TYPE_LABEL, ProgressTable, ServiceMeasures, StatCard, StatGrid } from "@/features/staff";
import { formatDate } from "@/lib/time";
import type { getSupervisorHome } from "../server";

export function SupervisorHome({ data }: { data: Awaited<ReturnType<typeof getSupervisorHome>> }) {
  const level2 = data.escalated.filter((c) => c.level === 2).length;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow text-leaf-600">Supervisor</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-leaf-950">Escalated cases</h1>
        <p className="mt-1 text-muted-foreground">
          Cases still open after the escalation time (demo setting). The original due time never resets.
        </p>
      </header>

      <StatGrid label="Escalations">
        <StatCard label="Escalated" value={data.escalated.length} tone={data.escalated.length ? "danger" : "plain"} />
        <StatCard label="Also at level 2" value={level2} tone={level2 ? "danger" : "plain"} />
      </StatGrid>

      <section aria-labelledby="queue-title">
        <h2 id="queue-title" className="sr-only">
          Escalated queue
        </h2>
        {data.escalated.length ? (
          <ul className="flex flex-col gap-4">
            {data.escalated.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/case/${c.id}`}
                    className="font-semibold text-leaf-950 underline-offset-4 hover:underline"
                  >
                    {ISSUE_TYPE_LABEL[c.issueType] ?? c.issueType}
                  </Link>
                  <StatusBadge status={c.status} />
                  <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                    Level {c.level}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {c.placeName}
                  {c.areaName && ` · ${c.areaName}`} ·{" "}
                  {c.workerName ? `Worker: ${c.workerName.split(" ")[0]}` : "No worker assigned"}
                </p>
                <DueLabel dueAt={c.dueAt} status={c.status} />
                <AssignForm reportId={c.id} workers={data.workers} currentWorkerId={c.workerId} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No escalated cases" hint="Cases appear here when they stay open past the escalation time." />
        )}
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-labelledby="areas-title">
          <h2 id="areas-title" className="text-xl font-bold text-leaf-950">
            Cases by area
          </h2>
          <div className="mt-4">
            <ProgressTable caption="Cases by area" nameLabel="Area" rows={data.areas} />
          </div>
        </section>
        <section aria-labelledby="workers-title">
          <h2 id="workers-title" className="text-xl font-bold text-leaf-950">
            Tasks by worker
          </h2>
          <div className="mt-4">
            <ProgressTable caption="Tasks by worker" nameLabel="Worker" rows={data.byWorker} />
          </div>
        </section>
      </div>

      <ServiceMeasures measures={data.measures} feedback={data.feedback} />

      <section aria-labelledby="reviews-title">
        <h2 id="reviews-title" className="text-xl font-bold text-leaf-950">
          Prevention reviews
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Read-only. Admins create and update reviews.</p>
        <div className="mt-4">
          {data.reviews.length ? (
            <ul className="flex flex-col gap-2">
              {data.reviews.map((r) => (
                <li key={r.id} className="rounded-xl border bg-card px-4 py-3">
                  <p className="font-medium text-leaf-950">
                    {r.placeName} · {r.status === "done" ? "Done" : "Open"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[r.suspected_cause, r.action, r.owner_name && `Owner: ${r.owner_name}`, r.review_date && `Review ${formatDate(r.review_date)}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No prevention reviews yet" />
          )}
        </div>
      </section>
    </div>
  );
}
