// Admin analytics: service KPIs, daily reports and closures, case status, issue and waste mix, areas,
// workers, pickups and duties.

import type { getAdminAnalytics } from "../server";
import { BarList } from "../widgets/BarList";
import { BarTrend } from "../widgets/BarTrend";
import { ChartCard } from "../widgets/ChartCard";
import { Donut } from "../widgets/Donut";
import { LineTrend } from "../widgets/LineTrend";
import { StackedBars } from "../widgets/StackedBars";
import { AnalyticsShell, periodLabel, TodayFigure } from "./AnalyticsShell";

export function AdminAnalytics({ data }: { data: Awaited<ReturnType<typeof getAdminAnalytics>> }) {
  const period = periodLabel(data.daily);
  const total = (key: string) => data.daily.reduce((s, p) => s + (p.values[key] ?? 0), 0);
  return (
    <AnalyticsShell title="Service at a glance" range={data.range} kpis={data.kpis}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Reports per day" period={period} aside={<TodayFigure points={data.daily} seriesKey="reported" label="Today's reports" />}>
          <BarTrend points={data.daily} series={data.series[0]} unit="reports" />
        </ChartCard>
        <ChartCard
          title="Reported vs closed"
          period={period}
          aside={
            <dl className="flex gap-4 text-right">
              {data.series.map((s) => (
                <div key={s.key}>
                  <dt className="flex items-center justify-end gap-1.5 text-sm text-leaf-950/70">
                    <span aria-hidden className={s.key === "reported" ? "size-2 rounded-full bg-leaf-600" : "size-2 rounded-full bg-sky-600"} /> {s.label}
                  </dt>
                  <dd className="text-3xl font-extrabold tabular-nums text-leaf-950">{total(s.key)}</dd>
                </div>
              ))}
            </dl>
          }
        >
          <LineTrend points={data.daily} series={data.series} />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Where cases stand" period="All cases right now">
          <Donut slices={data.status} centerLabel="cases" caption="Cases by status" />
        </ChartCard>
        <ChartCard title="Issue types" period={period}>
          <BarList items={data.issues} caption="Reports by issue type" />
        </ChartCard>
        <ChartCard title="Duties" period={period}>
          <Donut slices={data.duties} centerLabel="duties" caption="Duties by status" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Areas: done, open and overdue" period="All cases">
          <StackedBars rows={data.areas} caption="Cases per area" />
        </ChartCard>
        <ChartCard title="Workers: done, open and overdue" period="Assigned cases">
          <StackedBars rows={data.workers} caption="Cases per worker" />
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Waste categories reported" period={period}>
          <BarList items={data.waste} caption="Reports by waste category" />
        </ChartCard>
        <ChartCard title="Pickups by status" period="All pickup requests">
          <BarList items={data.pickups} caption="Pickups by status" limit={7} />
        </ChartCard>
        <ChartCard title="Pickups by waste type" period="All pickup requests">
          <BarList items={data.pickupWaste} caption="Pickups by waste type" />
        </ChartCard>
      </div>
    </AnalyticsShell>
  );
}
