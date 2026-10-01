import { EmptyState } from "./EmptyState";

type Row = { name: string; done: number; remaining: number; overdue: number };

// Done vs remaining per area or per worker (02-PRD F5 area overview, per-worker progress; supervisor overdue view).
export function ProgressTable({ caption, nameLabel, rows }: { caption: string; nameLabel: string; rows: Row[] }) {
  if (rows.length === 0) return <EmptyState title={`No ${nameLabel.toLowerCase()} data yet`} />;
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-left text-ui">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b bg-muted/60 text-sm text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">{nameLabel}</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Done</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Remaining</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Overdue</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.name} className="border-b last:border-0">
              <th scope="row" className="px-4 py-2.5 font-medium text-leaf-950">{r.name}</th>
              <td className="px-4 py-2.5 text-right">{r.done}</td>
              <td className="px-4 py-2.5 text-right">{r.remaining}</td>
              <td className={r.overdue ? "px-4 py-2.5 text-right font-semibold text-danger" : "px-4 py-2.5 text-right"}>
                {r.overdue}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
