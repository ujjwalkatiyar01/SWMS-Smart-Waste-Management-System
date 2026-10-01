"use client";

// Daily bars for one series. The chosen day (today by default) is highlighted in brand green with its
// value in a tooltip; hover, tap or arrow keys pick another day.

import { useEffect, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import type { DayPoint, Series } from "../schema";
import { EmptyChart, SrTable } from "./ChartCard";
import { dayLong, dayShort, niceMax, TONE } from "./tones";

export function BarTrend({ points, series, unit }: { points: DayPoint[]; series: Series; unit: string }) {
  const values = points.map((p) => p.values[series.key] ?? 0);
  const max = niceMax(Math.max(...values, 0));
  const [active, setActive] = useState(points.length - 1);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const every = points.length > 20 ? 5 : points.length > 10 ? 2 : 1;
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0];

  if (values.every((v) => v === 0)) return <EmptyChart />;

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
          <div aria-hidden className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => <span key={t} className="border-t border-dashed border-leaf-900/10" />)}
          </div>
          <div
            role="group"
            aria-label={`${series.label} per day. Use left and right arrow keys to move between days.`}
            tabIndex={0}
            onKeyDown={onKey}
            className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-[3%] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-leaf-600 sm:gap-[2%]"
          >
            {points.map((p, i) => {
              const v = values[i];
              return (
                <button
                  key={p.day}
                  type="button"
                  tabIndex={-1}
                  aria-label={`${dayLong(p.day)}: ${v} ${unit}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className="group relative flex h-full min-w-0 flex-1 cursor-pointer items-end"
                >
                  <span
                    className={cn(
                      "block w-full origin-bottom rounded-t-md motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out",
                      i === active ? TONE[series.tone].bg : "bg-leaf-900/10 group-hover:bg-leaf-900/20",
                      grown ? "scale-y-100" : "scale-y-0",
                    )}
                    style={{ height: `${Math.max(v ? 3 : 1, (v / max) * 100)}%`, transitionDelay: `${i * 20}ms` }}
                  />
                </button>
              );
            })}
          </div>
          {/* Tooltip for the chosen day */}
          <div
            aria-live="polite"
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-leaf-900/10 bg-white px-3 py-2 text-xs shadow-float motion-safe:transition-[left] motion-safe:duration-200"
            style={{ left: `${Math.min(88, Math.max(12, ((active + 0.5) / points.length) * 100))}%`, top: 0 }}
          >
            <p className="whitespace-nowrap text-leaf-950/60">{dayLong(points[active].day)}</p>
            <p className="whitespace-nowrap font-bold text-leaf-950">{values[active]} {unit}</p>
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 flex h-6 items-end gap-[3%] sm:gap-[2%]">
            {points.map((p, i) => (
              <span key={p.day} className="relative flex min-w-0 flex-1 justify-center">
                {(i % every === 0 || i === active) && (
                  <span className={cn("absolute whitespace-nowrap rounded-md px-1.5 text-[12px] leading-5", i === active ? "bg-leaf-100 font-semibold text-leaf-900" : "text-leaf-950/60", i !== active && i % every !== 0 && "hidden",
                    // Phones: every other label, so dates never overlap.
                    i !== active && (i / every) % 2 === 1 && "max-sm:hidden")}>
                    {dayShort(p.day)}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
      <SrTable caption={`${series.label} per day`} columns={["Day", series.label]} rows={points.map((p, i) => [dayLong(p.day), values[i]])} />
    </div>
  );
}
