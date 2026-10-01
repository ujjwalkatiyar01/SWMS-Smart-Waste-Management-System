// A list of cases as links to /case/[id]: type, status, place, due time. Used by the dashboard and the case list.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DueLabel, ISSUE_TYPE_LABEL } from "@/features/staff";
import type { OrgCase } from "@/features/staff/server";
import { relative } from "@/lib/time";

type Row = Pick<OrgCase, "id" | "issueType" | "status" | "placeName" | "areaName" | "createdAt" | "dueAt">;

export function CaseList({ rows, showReported = false }: { rows: Row[]; showReported?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/case/${r.id}`}
            className="flex min-h-11 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors hover:bg-leaf-50"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-leaf-950">{ISSUE_TYPE_LABEL[r.issueType] ?? r.issueType}</span>
                <StatusBadge status={r.status} />
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {r.placeName}
                {r.areaName && ` · ${r.areaName}`}
                {showReported && ` · reported ${relative(r.createdAt)}`}
              </span>
              <DueLabel dueAt={r.dueAt} status={r.status} />
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
