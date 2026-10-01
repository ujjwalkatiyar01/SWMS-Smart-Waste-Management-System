"use client";

// Two (or one) daily lines with a soft area under the first; hover, tap or arrow keys move a crosshair
// that shows every series' value for that day.

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { DayPoint, Series } from "../schema";
import { EmptyChart, SrTable } from "./ChartCard";
import { dayLong, dayShort, niceMax, TONE } from "./tones";

/** Smooth path through points (x, y in 0–100) that never overshoots the chart area. */
function smooth(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[Math.max(0, i - 1)];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = points[Math.min(points.length - 1, i + 2)];
    const clamp = (y: number) => Math.min(100, Math.max(0, y));
    const c1 = [x1 + (x2 - x0) / 6, clamp(y1 + (y2 - y0) / 6)];
    const c2 = [x2 - (x3 - x1) / 6, clamp(y2 - (y3 - y1) / 6)];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x2} ${y2}`;
  }
  return d;
}

export function LineTrend({ points, series }: { points: DayPoint[]; series: Series[] }) {
  const all = points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0));
  const max = niceMax(Math.max(...all, 0));
  const [active, setActive] = useState(points.length - 1);
  const x = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const every = points.length > 20 ? 5 : points.length > 10 ? 2 : 1;
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0];

  if (all.every((v) => v === 0)) return <EmptyChart />;

  function onKey(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    if (event.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, i + 1));
  }

  return (
    <div>
      <div className="relative flex h-56 gap-2 sm:h-64">
        <div aria-hidden className="flex w-8 shrink-0 flex-col justify-between pb-6 text-right text-xs tabular-nums text-leaf-950/60">
          {ticks.map((t) => <span key={t} className="-translate-y-1/2 leading-none last:translate-y-0">{Math.round(t * 10) / 10}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-2 top-0 bottom-6">
            <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
              {ticks.map((t) => <span key={t} className="border-t border-dashed border-leaf-900/10" />)}
            </div>
            <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {series.map((s, si) => {
                const pts = points.map((p, i) => [x(i), y(p.values[s.key] ?? 0)] as [number, number]);
                const line = smooth(pts);
                return (
                  <g key={s.key}>
                    {si === 0 && <path d={`${line} L 100 100 L 0 100 Z`} className={TONE[s.tone].fill} stroke="none" />}
                    <path d={line} fill="none" className={TONE[s.tone].stroke} strokeWidth={si === 0 ? 3 : 2.5} strokeDasharray={si === 0 ? undefined : "6 5"} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  </g>
                );
              })}
            </svg>
            <span aria-hidden className="absolute top-0 bottom-0 border-l border-dashed border-leaf-900/30" style={{ left: `${x(active)}%` }} />
            {series.map((s) => (
              <span
                key={s.key}
                aria-hidden
                className={cn("absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow", TONE[s.tone].bg)}
                style={{ left: `${x(active)}%`, top: `${y(points[active].values[s.key] ?? 0)}%` }}
              />
            ))}
            <div
              role="group"
              tabIndex={0}
              onKeyDown={onKey}
              aria-label={`${series.map((s) => s.label).join(" and ")} per day. Use left and right arrow keys to move between days.`}
              className="absolute inset-0 flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-leaf-600"
            >
              {points.map((p, i) => (
                <button
                  key={p.day}
                  type="button"
                  tabIndex={-1}
                  aria-label={`${dayLong(p.day)}: ${series.map((s) => `${p.values[s.key] ?? 0} ${s.label.toLowerCase()}`).join(", ")}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className="h-full flex-1 cursor-crosshair"
                />
              ))}
            </div>
            <div
              aria-live="polite"
              className="pointer-events-none absolute z-10 rounded-xl border border-leaf-900/10 bg-white px-3 py-2 text-xs shadow-float"
              // Beside the crosshair, on the side with more room, so it never leaves the card.
              style={x(active) > 50 ? { right: `${100 - x(active) + 3}%`, top: "6%" } : { left: `${x(active) + 3}%`, top: "6%" }}
            >
              <p className="whitespace-nowrap text-leaf-950/60">{dayLong(points[active].day)}</p>
              {series.map((s) => (
                <p key={s.key} className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-leaf-950">
                  <span className={cn("size-2 rounded-full", TONE[s.tone].bg)} aria-hidden /> {points[active].values[s.key] ?? 0} {s.label.toLowerCase()}
                </p>
              ))}
            </div>
          </div>
          <div aria-hidden className="absolute inset-x-2 bottom-0 h-6">
            {points.map((p, i) => (i % every === 0 || i === active) && (
              <span
                key={p.day}
                className={cn("absolute -translate-x-1/2 whitespace-nowrap rounded-md px-1.5 text-[12px] leading-5", i === active ? "z-10 bg-leaf-100 font-semibold text-leaf-900" : "text-leaf-950/60",
                  i !== active && (i / every) % 2 === 1 && "max-sm:hidden")}
                style={{ left: `${x(i)}%` }}
              >
                {dayShort(p.day)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <SrTable caption={series.map((s) => s.label).join(" and ") + " per day"} columns={["Day", ...series.map((s) => s.label)]}
        rows={points.map((p) => [dayLong(p.day), ...series.map((s) => p.values[s.key] ?? 0)])} />
    </div>
  );
}
