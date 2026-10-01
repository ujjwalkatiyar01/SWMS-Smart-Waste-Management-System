// Pure helpers for dashboard analytics: organisation-local day buckets and period comparisons.

import { orgDay } from "@/lib/time";
import type { DayPoint, RangeDays, Series } from "./schema";

export function parseRange(value: unknown): RangeDays {
  return value === "14" ? 14 : value === "30" ? 30 : 7;
}

/** Local day (YYYY-MM-DD) of a timestamp. */
export function dayOf(iso: string) {
  return orgDay(0, Date.parse(iso));
}

/** The last `range` local days, oldest first, ending today. */
export function lastDays(range: number, now = Date.now()) {
  return Array.from({ length: range }, (_, i) => orgDay(i - range + 1, now));
}

/** Start of the current and previous windows as timestamps (rolling, `range` days each). */
export function windows(range: number, now = Date.now()) {
  const day = 864e5;
  return { from: now - range * day, prevFrom: now - 2 * range * day, now };
}

export function inWindow(iso: string | null | undefined, from: number, to: number) {
  if (!iso) return false;
  const t = Date.parse(iso);
  return t >= from && t < to;
}

/** One point per day with a count for each series, from lists of timestamps. */
export function dailySeries(days: string[], series: (Series & { dates: (string | null | undefined)[] })[]): DayPoint[] {
  const counts = new Map(days.map((d) => [d, Object.fromEntries(series.map((s) => [s.key, 0])) as Record<string, number>]));
  for (const s of series) {
    for (const iso of s.dates) {
      if (!iso) continue;
      const bucket = counts.get(dayOf(iso));
      if (bucket) bucket[s.key] += 1;
    }
  }
  return days.map((day) => ({ day, values: counts.get(day)! }));
}

export function percent(part: number, whole: number) {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

export function average(values: number[]) {
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

/** Change in percent between two periods; null when there is nothing to compare with. */
export function change(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function countBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return map;
}
