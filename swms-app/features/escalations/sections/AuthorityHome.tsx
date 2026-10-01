// Higher authority home (02-PRD F9, 03 F5.2b): level-2 escalations as summaries only — no photos, notes,
// feedback or names (P1) — and predicted hotspots.

import { StatusBadge } from "@/components/shared/StatusBadge";
import { DueLabel, EmptyState, ISSUE_TYPE_LABEL, StatCard, StatGrid } from "@/features/staff";
import { formatDateTime } from "@/lib/time";
import type { getAuthorityHome } from "../server";

export function AuthorityHome({ data }: { data: Awaited<ReturnType<typeof getAuthorityHome>> }) {
  const { cases } = data;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow text-leaf-600">Higher authority</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-leaf-950">Level-2 escalations</h1>
        <p className="mt-1 text-muted-foreground">
          Summary view: status and facts only. Photos, notes, feedback and names stay with the local team.
        </p>
      </header>

      <StatGrid label="Level-2 escalations">
        <StatCard label="Level-2 cases" value={cases.length} tone={cases.length ? "danger" : "plain"} />
        <StatCard label="Overdue" value={cases.filter((c) => c.overdue).length} />
      </StatGrid>

      <section aria-labelledby="queue-title">
        <h2 id="queue-title" className="sr-only">
          Level-2 queue
        </h2>
        {cases.length ? (
          <ul className="flex flex-col gap-4">
            {cases.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-leaf-950">{ISSUE_TYPE_LABEL[c.issueType] ?? c.issueType}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {c.placeName}
                  {c.areaName && ` · ${c.areaName}`} · reported {formatDateTime(c.createdAt)}
                </p>
                <DueLabel dueAt={c.dueAt} status={c.status} />
                <p className="text-sm text-muted-foreground">
                  {c.eventTypes.length} updates · latest: {c.eventTypes.at(-1)?.replaceAll("_", " ") ?? "none"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No level-2 escalations" hint="Cases appear here when they stay open past the level-2 time." />
        )}
      </section>

      <section aria-labelledby="risk-title">
        <h2 id="risk-title" className="text-xl font-bold text-leaf-950">
          Predicted hotspots
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Prediction from demo data, not validated.</p>
        <div className="mt-4">
          {data.hotspots.length ? (
            <ol className="flex flex-col gap-2">
              {data.hotspots.map((h) => (
                <li key={h.name} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
                  <span className="font-medium text-leaf-950">{h.name}</span>
                  <span className="text-right text-sm tabular-nums text-muted-foreground">
                    <span className="font-semibold text-leaf-950">Risk {h.score} / 100</span>
                    <span className="block">
                      {h.last7} in 7 days · {h.last30} in 30 days
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No risk scores yet" hint="Scores are computed once a day from reports." />
          )}
        </div>
      </section>
    </div>
  );
}
