// Done / open / overdue per area or worker as one stacked bar each, with the numbers written out.

import type { StackRow } from "../schema";
import { EmptyChart, SrTable } from "./ChartCard";

const PARTS = [
  { key: "done", label: "Done", className: "bg-leaf-600" },
  { key: "open", label: "Open", className: "bg-sky-600/70" },
  { key: "overdue", label: "Overdue", className: "bg-danger" },
] as const;

export function StackedBars({ rows, caption }: { rows: StackRow[]; caption: string }) {
  const totals = rows.map((r) => PARTS.reduce((s, p) => s + (r.values[p.key] ?? 0), 0));
  const max = Math.max(...totals, 0);
  if (max === 0) return <EmptyChart />;
  return (
    <div className="flex flex-col gap-4">
      <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-leaf-950/70">
        {PARTS.map((p) => <li key={p.key} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${p.className}`} />{p.label}</li>)}
      </ul>
      <ul className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-leaf-950">{r.label}</span>
              <span className="shrink-0 tabular-nums text-leaf-950/70">
                {r.values.done} done · {r.values.open} open · <span className={r.values.overdue ? "font-semibold text-danger" : ""}>{r.values.overdue} overdue</span>
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-leaf-50" style={{ width: `${Math.max(8, (totals[i] / max) * 100)}%` }}>
              {PARTS.map((p) => (r.values[p.key] ? (
                <span key={p.key} className={`h-full ${p.className} animate-bar-in origin-left motion-reduce:animate-none`} style={{ width: `${(r.values[p.key] / totals[i]) * 100}%` }} />
              ) : null))}
            </div>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} columns={["Name", "Done", "Open", "Overdue"]} rows={rows.map((r) => [r.label, r.values.done, r.values.open, r.values.overdue])} />
    </div>
  );
}
