// Worker analytics: own tasks, duties and pickups over the period.

import type { getWorkerAnalytics } from "../server";
import { BarTrend } from "../widgets/BarTrend";
import { ChartCard } from "../widgets/ChartCard";
import { Donut } from "../widgets/Donut";
import { LineTrend } from "../widgets/LineTrend";
import { AnalyticsShell, periodLabel, TodayFigure } from "./AnalyticsShell";

export function WorkerAnalytics({ data }: { data: Awaited<ReturnType<typeof getWorkerAnalytics>> }) {
  const period = periodLabel(data.daily);
  return (
    <AnalyticsShell title="My work at a glance" range={data.range} kpis={data.kpis}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Tasks completed per day" period={period} aside={<TodayFigure points={data.daily} seriesKey="done" label="Today" />}>
          <BarTrend points={data.daily} series={data.series[0]} unit="tasks" />
        </ChartCard>
        <ChartCard title="Tasks and duties" period={period}>
          <LineTrend points={data.daily} series={data.series} />
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="My duties" period={period}>
          <Donut slices={data.duties} centerLabel="duties" caption="My duties by status" />
        </ChartCard>
        <ChartCard title="Cases given to me" period="All time">
          <Donut slices={data.tasks} centerLabel="cases" caption="My cases by status" />
        </ChartCard>
      </div>
    </AnalyticsShell>
  );
}
