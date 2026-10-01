// Higher-authority analytics from level-2 case summaries only (no photos, notes, feedback or names; P1).

import type { getAuthorityAnalytics } from "../server";
import { BarList } from "../widgets/BarList";
import { BarTrend } from "../widgets/BarTrend";
import { ChartCard } from "../widgets/ChartCard";
import { AnalyticsShell, periodLabel } from "./AnalyticsShell";

export function AuthorityAnalytics({ data }: { data: Awaited<ReturnType<typeof getAuthorityAnalytics>> }) {
  const period = periodLabel(data.daily);
  return (
    <AnalyticsShell title="Level-2 escalations at a glance" range={data.range} kpis={data.kpis}>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Level-2 cases by day reported" period={period} className="lg:col-span-3">
          <BarTrend points={data.daily} series={data.series[0]} unit="cases" />
        </ChartCard>
        <ChartCard title="By area" period="Escalated now" className="lg:col-span-2">
          <BarList items={data.areas} caption="Level-2 cases by area" />
        </ChartCard>
        <ChartCard title="By issue type" period="Escalated now">
          <BarList items={data.issues} caption="Level-2 cases by issue type" />
        </ChartCard>
      </div>
    </AnalyticsShell>
  );
}
