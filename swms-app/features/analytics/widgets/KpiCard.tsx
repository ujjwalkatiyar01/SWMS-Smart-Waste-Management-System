// One headline number with its change against the previous period of the same length.

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { change } from "../compute";
import type { Kpi } from "../schema";

const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export function formatKpi(value: number | null, format: Kpi["format"]) {
  if (value === null) return "—";
  const n = number.format(value);
  return format === "percent" ? `${n}%` : format === "hours" ? `${n} h` : format === "km" ? `${n} km` : n;
}

export function KpiCard({ kpi, range, index = 0 }: { kpi: Kpi; range: number; index?: number }) {
  const diff = change(kpi.value, kpi.previous);
  const fresh = diff === null && kpi.previous === 0 && (kpi.value ?? 0) > 0;
  const good = diff === null || diff === 0 || kpi.better === "neutral" ? null : (diff > 0) === (kpi.better === "up");
  const Arrow = fresh ? ArrowUp : diff === null || diff === 0 ? Minus : diff > 0 ? ArrowUp : ArrowDown;

  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-3xl border border-leaf-900/5 bg-white p-5 shadow-card animate-enter motion-reduce:animate-none"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-leaf-950/70">{kpi.label}</h3>
        {kpi.previous !== null && (diff !== null || fresh) && (
          <span
            className={cn(
              "shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums",
              fresh ? "bg-sky-soft text-sky-800" : good === null ? "bg-leaf-50 text-leaf-900" : good ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            {fresh ? "New" : `${diff! > 0 ? "+" : ""}${diff}%`}
          </span>
        )}
      </div>
      <p className="flex items-center gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-leaf-950 tabular-nums">{formatKpi(kpi.value, kpi.format)}</span>
        {kpi.previous !== null && kpi.value !== null && (
          <span
            aria-hidden
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              fresh ? "bg-sky-soft text-sky-800" : good === null ? "bg-leaf-50 text-leaf-800" : good ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            <Arrow className="size-3" strokeWidth={3} />
          </span>
        )}
      </p>
      <p className="text-sm text-leaf-950/70">
        {kpi.previous !== null
          ? `Compared to previous ${range} days (${formatKpi(kpi.previous, kpi.format)})`
          : kpi.hint ?? `Nothing to compare in the previous ${range} days`}
      </p>
    </article>
  );
}
