// Admin dashboard (02-PRD F5, 03 F8): counts by status, service measures, overdue cases, top locations,
// predicted hotspots, area overview, per-worker progress, pickups and recent reports.

import Link from "next/link";
import { Flag, Map as MapIcon, ListFilter, Settings } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState, ProgressTable, ServiceMeasures, StatCard, StatGrid } from "@/features/staff";
import { CaseList } from "../widgets/CaseList";
import { ExportForm } from "../widgets/ExportForm";
import type { getAdminDashboard } from "../server";

type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export function AdminDashboard({ data }: { data: Dashboard }) {
  const { counts } = data;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header>
        <p className="eyebrow text-leaf-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-leaf-950">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Sample data. Numbers update when you open or refresh this page.</p>
        <nav aria-label="Admin tools" className="mt-4 flex flex-wrap gap-2">
          {[
            { href: "/admin/cases", label: "All cases", icon: ListFilter },
            { href: "/admin/map", label: "Map", icon: MapIcon },
            { href: "/admin/setup", label: "Setup", icon: Settings },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-leaf-200 bg-white px-4 text-ui font-semibold text-leaf-900 hover:bg-leaf-50"
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
      </header>

      <StatGrid label="Reports by status">
        <StatCard href="/admin/cases?status=submitted" label="New" value={counts.submitted} tone={counts.submitted ? "warning" : "plain"} />
        <StatCard href="/admin/cases?status=assigned" label="Assigned" value={counts.assigned} />
        <StatCard href="/admin/cases?status=awaiting_review" label="Awaiting review" value={counts.awaitingReview} />
        <StatCard href="/admin/cases?status=closed" label="Closed" value={counts.closed} />
        <StatCard href="/admin/cases?status=overdue" label="Overdue" value={counts.overdue} tone={counts.overdue ? "danger" : "plain"} />
        <StatCard href="/admin/cases?status=disputed" label="Disputed" value={counts.disputed} tone={counts.disputed ? "warning" : "plain"} />
        <StatCard href="/admin/cases?status=returned" label="Returned" value={counts.returned} tone={counts.returned ? "warning" : "plain"} />
        <StatCard href="/admin/cases?status=far_from_site" label="Far from site" value={counts.farFromSite} tone={counts.farFromSite ? "warning" : "plain"} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Section id="overdue" title="Overdue cases">
          {data.overdue.length ? (
            <CaseList rows={data.overdue} />
          ) : (
            <EmptyState title="No overdue cases" hint="Cases past their due time appear here." />
          )}
        </Section>

        <div className="flex flex-col gap-10">
          <Section
            id="top"
            title="Top locations"
            hint={`Distinct incidents in the last ${data.windowDays} days. Flagged at ${data.threshold} (demo setting).`}
          >
            {data.topLocations.length ? (
              <ol className="flex flex-col gap-2">
                {data.topLocations.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/location/${l.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-leaf-50">
                    <span className="font-medium text-leaf-950">{l.name}</span>
                    <span className="flex items-center gap-2 text-sm">
                      {l.flagged && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                          <Flag aria-hidden className="size-3" /> Flagged
                        </span>
                      )}
                      <span className="tabular-nums text-muted-foreground">
                        {l.incidents} {l.incidents === 1 ? "incident" : "incidents"}
                      </span>
                    </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No incidents at registered locations yet" />
            )}
          </Section>

          <Section id="risk" title="Predicted hotspots" hint="Prediction from demo data, not validated.">
            {data.hotspots.length ? (
              <ol className="flex flex-col gap-2">
                {data.hotspots.map((h) => (
                  <li key={h.id}>
                    <Link href={`/admin/location/${h.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-leaf-50">
                    <span className="font-medium text-leaf-950">{h.name}</span>
                    <span className="text-right text-sm tabular-nums text-muted-foreground">
                      <span className="font-semibold text-leaf-950">Risk {h.score} / 100</span>
                      <span className="block">
                        {h.last7} in 7 days · {h.last30} in 30 days
                      </span>
                    </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No risk scores yet" hint="Scores are computed once a day from reports." />
            )}
          </Section>
        </div>
      </div>

      <ServiceMeasures measures={data.measures} feedback={data.feedback} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Section id="areas" title="Area overview">
          <ProgressTable caption="Done and remaining cases by area" nameLabel="Area" rows={data.areas} />
        </Section>
        <Section id="workers" title="Worker progress">
          <ProgressTable caption="Done and remaining tasks by worker" nameLabel="Worker" rows={data.workers} />
        </Section>
      </div>

      <Section id="pickups" title="Pickups by status">
        {data.pickups.length ? (
          <ul className="flex flex-wrap gap-3">
            {data.pickups.map((p) => (
              <li key={p.status} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                <StatusBadge status={p.status} />
                <span className="font-bold tabular-nums text-leaf-950">{p.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No pickup requests yet" />
        )}
        {data.recentPickups.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {data.recentPickups.map((pickup) => (
              <li key={pickup.id}>
                <Link href={`/pickup/${pickup.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-leaf-900/10 bg-white px-4 py-3 hover:bg-leaf-50">
                  <span className="font-semibold text-leaf-950">{pickup.waste_type.replaceAll("_", "-")} · {pickup.preferred_date} · {pickup.slot}</span>
                  <StatusBadge status={pickup.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="recent" title="Recent reports">
        <Link href="/admin/cases" className="-mt-2 mb-4 inline-flex min-h-11 items-center font-semibold text-leaf-800 underline-offset-4 hover:underline">
          See all cases and filter them →
        </Link>
        {data.recent.length ? (
          <CaseList rows={data.recent} showReported />
        ) : (
          <EmptyState title="No reports yet" hint="New reports from residents appear here." />
        )}
      </Section>

      <Section id="export" title="Export data" hint="Download a CSV for a spreadsheet. Dates are in the organisation's time zone. No resident names or contact details are included.">
        <ExportForm areaNames={data.areas.map((a) => a.name)} />
      </Section>
    </div>
  );
}

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-xl font-bold text-leaf-950">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
