// Admin dashboard (02-PRD F5, 03 F8): counts by status, service measures, overdue cases, top locations,
// predicted hotspots, area overview, per-worker progress, pickups and recent reports.

import Link from "next/link";
import {
  AlarmClock, CalendarClock, CheckCircle2, Download, Eye, Flag, Inbox, ListFilter, Map as MapIcon, MapPinOff, MessageSquareWarning, Route, Settings, Undo2, UserCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DashboardCard, EmptyState, ProgressTable, ServiceMeasures, StatCard, StatGrid } from "@/features/staff";
import { CaseList } from "../widgets/CaseList";
import { ExportForm } from "../widgets/ExportForm";
import type { getAdminDashboard } from "../server";

type Dashboard = Awaited<ReturnType<typeof getAdminDashboard>>;

export function AdminDashboard({ data }: { data: Dashboard }) {
  const { counts } = data;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-leaf-600">Admin</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-leaf-950">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Sample data. Numbers update when you open or refresh this page.</p>
        </div>
        <nav aria-label="Admin tools" className="flex flex-wrap gap-2">
          {[
            { href: "/admin/cases", label: "All cases", icon: ListFilter },
            { href: "/admin/map", label: "Map", icon: MapIcon },
            { href: "/admin/duties", label: "Duty roster", icon: CalendarClock },
            { href: "/admin/trips", label: "Vehicle trips", icon: Route },
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
          <a href="#export" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground shadow-cta hover:bg-leaf-800">
            <Download className="size-4" aria-hidden /> Export
          </a>
        </nav>
      </header>

      <StatGrid label="Reports by status">
        <StatCard href="/admin/cases?status=submitted" icon={Inbox} label="New" value={counts.submitted} tone={counts.submitted ? "warning" : "plain"} hint="Waiting to be assigned" />
        <StatCard href="/admin/cases?status=assigned" icon={UserCheck} label="Assigned" value={counts.assigned} hint="With a worker" />
        <StatCard href="/admin/cases?status=awaiting_review" icon={Eye} label="Awaiting review" value={counts.awaitingReview} hint="Fixed, resident to confirm" />
        <StatCard href="/admin/cases?status=overdue" icon={AlarmClock} label="Overdue" value={counts.overdue} tone={counts.overdue ? "danger" : "plain"} hint="Past their due time" />
      </StatGrid>
      <StatGrid label="More report counts">
        <StatCard href="/admin/cases?status=closed" icon={CheckCircle2} label="Closed" value={counts.closed} />
        <StatCard href="/admin/cases?status=disputed" icon={MessageSquareWarning} label="Disputed" value={counts.disputed} tone={counts.disputed ? "warning" : "plain"} />
        <StatCard href="/admin/cases?status=returned" icon={Undo2} label="Returned" value={counts.returned} tone={counts.returned ? "warning" : "plain"} />
        <StatCard href="/admin/cases?status=far_from_site" icon={MapPinOff} label="Far from site" value={counts.farFromSite} tone={counts.farFromSite ? "warning" : "plain"} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <DashboardCard id="overdue" title="Overdue cases">
            {data.overdue.length ? (
              <CaseList rows={data.overdue} />
            ) : (
              <EmptyState title="No overdue cases" hint="Cases past their due time appear here." />
            )}
          </DashboardCard>

          <ServiceMeasures measures={data.measures} feedback={data.feedback} />

          <DashboardCard
            id="recent"
            title="Recent reports"
            action={
              <Link href="/admin/cases" className="inline-flex min-h-11 items-center font-semibold text-leaf-800 underline-offset-4 hover:underline">
                See all cases and filter them →
              </Link>
            }
          >
            {data.recent.length ? (
              <CaseList rows={data.recent} showReported />
            ) : (
              <EmptyState title="No reports yet" hint="New reports from residents appear here." />
            )}
          </DashboardCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <DashboardCard id="risk" title="Predicted hotspots" hint="Prediction from demo data, not validated.">
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
          </DashboardCard>

          <DashboardCard
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
          </DashboardCard>

          <DashboardCard id="pickups" title="Pickups by status">
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
          </DashboardCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard id="areas" title="Area overview">
          <ProgressTable caption="Done and remaining cases by area" nameLabel="Area" rows={data.areas} />
        </DashboardCard>
        <DashboardCard id="workers" title="Worker progress">
          <ProgressTable caption="Done and remaining tasks by worker" nameLabel="Worker" rows={data.workers} />
        </DashboardCard>
      </div>

      <DashboardCard id="export" title="Export data" hint="Download a CSV for a spreadsheet. Dates are in the organisation's time zone. No resident names or contact details are included.">
        <ExportForm areaNames={data.areas.map((a) => a.name)} />
      </DashboardCard>
    </div>
  );
}
