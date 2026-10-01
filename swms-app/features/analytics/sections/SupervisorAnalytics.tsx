// Supervisor analytics: escalation pressure, daily flow, status, areas and workers.

import type { getSupervisorAnalytics } from "../server";
import { BarTrend } from "../widgets/BarTrend";
import { ChartCard } from "../widgets/ChartCard";
import { Donut } from "../widgets/Donut";
import { LineTrend } from "../widgets/LineTrend";
import { StackedBars } from "../widgets/StackedBars";
import { AnalyticsShell, periodLabel, TodayFigure } from "./AnalyticsShell";

export function SupervisorAnalytics({ data }: { data: Awaited<ReturnType<typeof getSupervisorAnalytics>> }) {
  const period = periodLabel(data.daily);
  return (
    <AnalyticsShell title="Service and escalations" range={data.range} kpis={data.kpis}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Reports per day" period={period} aside={<TodayFigure points={data.daily} seriesKey="reported" label="Today's reports" />}>
          <BarTrend points={data.daily} series={data.series[0]} unit="reports" />
        </ChartCard>
        <ChartCard title="Reported vs closed" period={period}>
          <LineTrend points={data.daily} series={data.series} />
        </ChartCard>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Where cases stand" period="All cases right now">
          <Donut slices={data.status} centerLabel="cases" caption="Cases by status" />
        </ChartCard>
        <ChartCard title="Areas" period="All cases">
          <StackedBars rows={data.areas} caption="Cases per area" />
        </ChartCard>
        <ChartCard title="Workers" period="Assigned cases">
          <StackedBars rows={data.workers} caption="Cases per worker" />
        </ChartCard>
      </div>
    </AnalyticsShell>
  );
}
