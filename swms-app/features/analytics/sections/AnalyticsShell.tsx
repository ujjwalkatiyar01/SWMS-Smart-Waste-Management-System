// Shared frame of the analytics block on every dashboard: heading, period switch, KPI cards, then charts.

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayPoint, Kpi, RangeDays } from "../schema";
import { KpiCard } from "../widgets/KpiCard";
import { RangeSwitch } from "../widgets/RangeSwitch";
import { dayShort } from "../widgets/tones";

export function periodLabel(points: DayPoint[]) {
  return points.length ? `${dayShort(points[0].day)} – ${dayShort(points[points.length - 1].day)}` : "";
}

/** "Today" value with its change against yesterday, shown at the top right of a daily chart. */
export function TodayFigure({ points, seriesKey, label }: { points: DayPoint[]; seriesKey: string; label: string }) {
  const today = points.at(-1)?.values[seriesKey] ?? 0;
  const yesterday = points.at(-2)?.values[seriesKey] ?? 0;
  const diff = today - yesterday;
  return (
    <div className="text-right">
      <p className="text-sm text-leaf-950/70">{label}</p>
      <p className="flex items-center justify-end gap-2">
        <span className="text-3xl font-extrabold tabular-nums text-leaf-950">{today}</span>
        <span className={cn("rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums", diff === 0 ? "bg-leaf-50 text-leaf-900" : "bg-sky-soft text-sky-800")}>
          {diff > 0 ? "+" : ""}{diff} vs yesterday
        </span>
      </p>
    </div>
  );
}

export function AnalyticsShell({ title, range, kpis, children }: { title: string; range: RangeDays; kpis: Kpi[]; children: ReactNode }) {
  return (
    <section aria-labelledby="analytics-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5 text-leaf-600"><BarChart3 className="size-4" aria-hidden /> Analytics</p>
          <h2 id="analytics-title" className="mt-1 text-2xl font-extrabold tracking-tight text-leaf-950">{title}</h2>
          <p className="mt-1 text-sm text-leaf-950/70">Last {range} days of your organisation&apos;s sample data, compared with the {range} days before.</p>
        </div>
        <RangeSwitch range={range} />
      </div>
      <div className={cn("grid gap-4 sm:grid-cols-2", kpis.length === 5 ? "lg:grid-cols-3 xl:grid-cols-5" : kpis.length > 4 ? "xl:grid-cols-4" : "lg:grid-cols-4")}>
        {kpis.map((k, i) => <KpiCard key={k.label} kpi={k} range={range} index={i} />)}
      </div>
      {children}
    </section>
  );
}
