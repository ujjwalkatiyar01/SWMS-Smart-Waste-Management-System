// All cases of the organisation with status, type and area filters (02-PRD F5, 03 F8). Filters live in the URL.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState, ISSUE_TYPE_LABEL } from "@/features/staff";
import type { getAdminCases } from "../server";
import type { CaseFilters } from "../schema";
import { CaseList } from "../widgets/CaseList";

type Cases = Awaited<ReturnType<typeof getAdminCases>>;

const STATUS_OPTIONS: [string, string][] = [
  ["submitted", "New"],
  ["assigned", "Assigned"],
  ["returned", "Returned"],
  ["awaiting_review", "Awaiting review"],
  ["disputed", "Disputed"],
  ["reopened", "Reopened"],
  ["closed", "Closed"],
  ["rejected", "Rejected"],
  ["overdue", "Overdue"],
  ["far_from_site", "Completed far from site"],
];

const selectClass =
  "h-11 rounded-lg border border-input bg-card px-3 text-ui outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminCases({ data, filters }: { data: Cases; filters: CaseFilters }) {
  const filtered = Boolean(filters.status || filters.type || filters.area);
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link href="/admin" className="inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-ui font-semibold text-leaf-900 hover:bg-leaf-100">
        <ArrowLeft className="size-4" aria-hidden /> Dashboard
      </Link>
      <header>
        <p className="eyebrow text-leaf-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-leaf-950">All cases</h1>
      </header>

      <form method="get" className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-4 sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
          Status
          <select name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">All</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
          Issue type
          <select name="type" defaultValue={filters.type ?? ""} className={selectClass}>
            <option value="">All</option>
            {Object.entries(ISSUE_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-leaf-950">
          Area
          <select name="area" defaultValue={filters.area} className={selectClass}>
            <option value="">All</option>
            {data.areaNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className="h-11 flex-1 rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800">
            Apply
          </button>
          {filtered && (
            <Link href="/admin/cases" className="inline-flex h-11 items-center rounded-full px-4 text-ui font-semibold text-leaf-900 hover:bg-leaf-100">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p role="status" className="text-sm text-muted-foreground">
        {data.total} {data.total === 1 ? "case" : "cases"}
        {data.total > data.rows.length && ` — showing the newest ${data.rows.length}`}
      </p>
      {data.rows.length ? (
        <CaseList rows={data.rows} showReported />
      ) : (
        <EmptyState title="No cases match these filters" hint="Change or clear the filters." />
      )}
    </div>
  );
}
