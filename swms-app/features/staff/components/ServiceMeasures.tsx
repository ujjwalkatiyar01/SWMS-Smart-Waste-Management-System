import type { feedbackCounts, serviceMeasures } from "../measures";
import { StatCard, StatGrid } from "./StatCard";

// Service measures and feedback counts (02-PRD F5, labelled demo data).
export function ServiceMeasures({
  measures,
  feedback,
}: {
  measures: ReturnType<typeof serviceMeasures>;
  feedback: ReturnType<typeof feedbackCounts>;
}) {
  return (
    <section aria-labelledby="measures-title" className="flex flex-col gap-4 rounded-2xl border border-leaf-100 bg-white p-5 shadow-card">
      <div>
        <h2 id="measures-title" className="text-lg font-bold text-leaf-950">
          Service measures
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          From sample data; not real performance. {measures.closed} closed {measures.closed === 1 ? "case" : "cases"}.
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-leaf-100 bg-cream p-4">
          <dt className="text-sm font-medium">Average time to close</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums text-leaf-950">
            {measures.avgHoursToClose === null ? "—" : `${measures.avgHoursToClose}h`}
          </dd>
        </div>
        <div className="rounded-2xl border border-leaf-100 bg-cream p-4">
          <dt className="text-sm font-medium">Closed before due</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums text-leaf-950">
            {measures.closedBeforeDuePct === null ? "—" : `${measures.closedBeforeDuePct}%`}
          </dd>
        </div>
      </dl>
      <StatGrid label="Resident feedback after completion">
        <StatCard label="Resolved" value={feedback.resolved} />
        <StatCard label="Partly resolved" value={feedback.partly} />
        <StatCard label="Not resolved" value={feedback.notResolved} />
        <StatCard label="No response" value={feedback.none} />
      </StatGrid>
    </section>
  );
}
