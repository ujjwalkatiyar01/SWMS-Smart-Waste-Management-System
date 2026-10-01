// Dashboard numbers computed from organisation cases (02-PRD F5 service measures, 03 F8). Demo data, not real performance.

import { isOverdueStatus } from "./content/labels";
import type { OrgCase } from "./server";

const DONE = ["awaiting_review", "closed"];

export function serviceMeasures(cases: OrgCase[]) {
  const closed = cases.filter((c) => c.status === "closed" && c.closedAt);
  const hours = closed.map((c) => (Date.parse(c.closedAt!) - Date.parse(c.createdAt)) / 36e5);
  const judged = closed.filter((c) => c.slaMet !== null);
  return {
    closed: closed.length,
    avgHoursToClose: hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null,
    closedBeforeDuePct: judged.length ? Math.round((100 * judged.filter((c) => c.slaMet).length) / judged.length) : null,
  };
}

// Feedback after a completion attempt; "No response" is never counted as satisfied (02-PRD F4).
export function feedbackCounts(cases: OrgCase[]) {
  const answered = cases.filter((c) => c.attempts > 0);
  const count = (value: string) => answered.filter((c) => c.feedback === value).length;
  return { resolved: count("resolved"), partly: count("partly"), notResolved: count("not_resolved"), none: count("none") };
}

// Done vs remaining per area or per worker (02-PRD F5 area overview and per-worker progress).
export function progressBy(cases: OrgCase[], key: "areaName" | "workerName") {
  const groups = new Map<string, { name: string; done: number; remaining: number; overdue: number }>();
  for (const c of cases) {
    const name = c[key];
    if (!name) continue;
    const g = groups.get(name) ?? { name, done: 0, remaining: 0, overdue: 0 };
    // For a worker, only their assigned work is "remaining"; for an area, every open case is.
    if (DONE.includes(c.status)) g.done += 1;
    else if (key === "workerName" ? c.status === "assigned" : isOverdueStatus(c.status)) g.remaining += 1;
    if (c.overdue) g.overdue += 1;
    groups.set(name, g);
  }
  return [...groups.values()].sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
}
