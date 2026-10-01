// Dashboard analytics helpers: period change, daily buckets in the organisation's time zone.

import { describe, expect, it } from "vitest";
import { change, dailySeries, lastDays, parseRange, percent } from "@/features/analytics/compute";
import { niceMax } from "@/features/analytics/widgets/tones";

describe("analytics helpers", () => {
  it("compares periods without dividing by zero", () => {
    expect(change(15, 10)).toBe(50);
    expect(change(5, 10)).toBe(-50);
    expect(change(3, 0)).toBeNull(); // shown as "New"
    expect(change(0, 0)).toBe(0);
    expect(change(null, 4)).toBeNull();
    expect(percent(1, 3)).toBe(33);
    expect(percent(1, 0)).toBeNull();
  });

  it("puts timestamps on the organisation's local day", () => {
    const now = Date.parse("2026-10-01T06:00:00Z"); // 11:30 in Kolkata
    const days = lastDays(3, now);
    expect(days).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
    const points = dailySeries(days, [
      // 20:00 UTC on 30 Sept is already 1 Oct 01:30 in Kolkata
      { key: "r", label: "R", tone: "leaf", dates: ["2026-09-30T20:00:00Z", "2026-09-29T10:00:00Z", "2026-09-10T10:00:00Z", null] },
    ]);
    expect(points.map((p) => p.values.r)).toEqual([1, 0, 1]);
  });

  it("uses whole-number axis steps and a safe default period", () => {
    expect(niceMax(5)).toBe(8);
    expect(niceMax(15)).toBe(20);
    expect(niceMax(0)).toBe(4);
    expect(parseRange("30")).toBe(30);
    expect(parseRange("999")).toBe(7);
  });
});
