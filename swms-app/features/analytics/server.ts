// Server-only reads for dashboard analytics. Each role's reads use the session client, so RLS keeps every
// number inside the viewer's organisation (and, for workers, their own work; for the higher authority,
// summaries only — P1). Numbers come from the organisation's (demo) data.

import "server-only";
import { getAuthorityHome } from "@/features/escalations/server";
import { ISSUE_TYPE_LABEL, PICKUP_WASTE_LABEL, progressBy } from "@/features/staff";
import { getStaffContext, readOrgCases, type OrgCase } from "@/features/staff/server";
import { orgClock, orgDay } from "@/lib/time";
import { average, countBy, dailySeries, inWindow, lastDays, percent, windows } from "./compute";
import type { DayPoint, Kpi, RangeDays, Series, Slice, StackRow, Tone } from "./schema";

const iso = (t: number) => new Date(t).toISOString();

const STATUS_GROUPS: { label: string; tone: Tone; statuses: string[] }[] = [
  { label: "New", tone: "amber", statuses: ["submitted"] },
  { label: "With a worker", tone: "sky", statuses: ["assigned", "returned", "reopened"] },
  { label: "Awaiting review", tone: "lime", statuses: ["awaiting_review", "disputed"] },
  { label: "Closed", tone: "leaf", statuses: ["closed"] },
  { label: "Rejected or cancelled", tone: "muted", statuses: ["rejected", "cancelled"] },
];

const WASTE_LABEL: Record<string, string> = {
  wet: "Wet", dry: "Dry", biomedical: "Biomedical", hazardous: "Hazardous", e_waste: "E-waste", mixed_uncertain: "Mixed / unsure",
};

const PICKUP_STATUS: Record<string, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "amber" },
  scheduled: { label: "Scheduled", tone: "sky" },
  collected: { label: "Collected", tone: "leaf" },
  missed: { label: "Missed", tone: "danger" },
  refused: { label: "Refused", tone: "danger" },
  declined: { label: "Declined", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

function statusSlices(cases: { status: string }[]): Slice[] {
  return STATUS_GROUPS.map((g) => ({ label: g.label, tone: g.tone, value: cases.filter((c) => g.statuses.includes(c.status)).length }));
}

function ranked(map: Map<string, number>, label: (key: string) => string, tone: Tone): Slice[] {
  return [...map.entries()].map(([key, value]) => ({ label: label(key), value, tone })).sort((a, b) => b.value - a.value);
}

/** Duty status with "missed" worked out the same way as the duty screens. */
function dutyState(d: { status: string; duty_date: string; end_time: string }) {
  const today = orgDay();
  const ended = d.duty_date < today || (d.duty_date === today && d.end_time.slice(0, 5) <= orgClock());
  return d.status === "scheduled" && ended ? "missed" : d.status;
}

function closedStats(cases: OrgCase[], from: number, to: number) {
  const closed = cases.filter((c) => c.status === "closed" && inWindow(c.closedAt, from, to));
  const judged = closed.filter((c) => c.slaMet !== null);
  return {
    count: closed.length,
    onTime: percent(judged.filter((c) => c.slaMet).length, judged.length),
    hours: average(closed.map((c) => (Date.parse(c.closedAt!) - Date.parse(c.createdAt)) / 36e5)),
  };
}

/** Done / open / overdue per area or worker; open excludes overdue so the bar parts add up. */
function stack(rows: { name: string; done: number; remaining: number; overdue: number }[]): StackRow[] {
  return rows.map((r) => ({ label: r.name, values: { done: r.done, open: Math.max(0, r.remaining - r.overdue), overdue: r.overdue } }));
}

const REPORTED: Series = { key: "reported", label: "Reported", tone: "leaf" };
const CLOSED: Series = { key: "closed", label: "Closed", tone: "sky" };

/** Organisation-wide analytics for the admin dashboard. */
export async function getAdminAnalytics(range: RangeDays) {
  const { db } = await getStaffContext(["admin"]);
  const { from, prevFrom, now } = windows(range);
  const [cases, waste, pickups, collected, duties, trips] = await Promise.all([
    readOrgCases(db),
    db.from("reports").select("waste_category, created_at").gte("created_at", iso(from)),
    db.from("pickup_requests").select("status, waste_type, created_at"),
    db.from("pickup_events").select("created_at").eq("type", "collected").gte("created_at", iso(prevFrom)),
    db.from("worker_duties").select("status, duty_date, end_time, done_at").gte("duty_date", orgDay(-2 * range)),
    db.from("vehicle_trips").select("started_at, distance_m").gte("started_at", iso(prevFrom)),
  ]);
  if (waste.error || pickups.error || collected.error || duties.error || trips.error) throw new Error("Analytics read failed");

  const created = (a: number, b: number) => cases.filter((c) => inWindow(c.createdAt, a, b)).length;
  const cur = closedStats(cases, from, now);
  const prev = closedStats(cases, prevFrom, from);
  const pickupsIn = (a: number, b: number) => pickups.data.filter((p) => inWindow(p.created_at, a, b)).length;
  const collectedIn = (a: number, b: number) => collected.data.filter((p) => inWindow(p.created_at, a, b)).length;
  const dutiesDone = (a: number, b: number) => duties.data.filter((d) => inWindow(d.done_at, a, b)).length;
  const km = (a: number, b: number) =>
    Math.round(trips.data.filter((t) => inWindow(t.started_at, a, b)).reduce((s, t) => s + t.distance_m, 0) / 100) / 10;

  const kpis: Kpi[] = [
    { label: "New reports", value: created(from, now), previous: created(prevFrom, from), format: "count", better: "neutral" },
    { label: "Cases closed", value: cur.count, previous: prev.count, format: "count", better: "up" },
    { label: "Closed on time", value: cur.onTime, previous: prev.onTime, format: "percent", better: "up" },
    { label: "Average time to close", value: cur.hours, previous: prev.hours, format: "hours", better: "down" },
    { label: "Pickup requests", value: pickupsIn(from, now), previous: pickupsIn(prevFrom, from), format: "count", better: "neutral" },
    { label: "Pickups collected", value: collectedIn(from, now), previous: collectedIn(prevFrom, from), format: "count", better: "up" },
    { label: "Duties completed", value: dutiesDone(from, now), previous: dutiesDone(prevFrom, from), format: "count", better: "up" },
    { label: "Distance driven", value: km(from, now), previous: km(prevFrom, from), format: "km", better: "neutral", hint: "From drivers' phone GPS" },
  ];

  const days = lastDays(range, now);
  const daily: DayPoint[] = dailySeries(days, [
    { ...REPORTED, dates: cases.map((c) => c.createdAt) },
    { ...CLOSED, dates: cases.filter((c) => c.status === "closed").map((c) => c.closedAt) },
  ]);

  const recent = cases.filter((c) => inWindow(c.createdAt, from, now));
  const dutyStates = countBy(duties.data.filter((d) => d.duty_date >= orgDay(-range + 1) && d.duty_date <= orgDay()), dutyState);

  return {
    range,
    kpis,
    daily,
    series: [REPORTED, CLOSED],
    status: statusSlices(cases),
    issues: ranked(countBy(recent, (c) => c.issueType), (k) => ISSUE_TYPE_LABEL[k] ?? k, "leaf"),
    waste: ranked(countBy(waste.data, (r) => r.waste_category ?? "mixed_uncertain"), (k) => WASTE_LABEL[k] ?? k, "lime"),
    areas: stack(progressBy(cases, "areaName")),
    workers: stack(progressBy(cases, "workerName")),
    pickups: ranked(countBy(pickups.data, (p) => p.status), (k) => PICKUP_STATUS[k]?.label ?? k, "sky")
      .map((s) => ({ ...s, tone: Object.values(PICKUP_STATUS).find((p) => p.label === s.label)?.tone ?? "sky" })),
    pickupWaste: ranked(countBy(pickups.data, (p) => p.waste_type), (k) => PICKUP_WASTE_LABEL[k] ?? k, "sky"),
    duties: [
      { label: "Done", tone: "leaf", value: dutyStates.get("done") ?? 0 },
      { label: "In progress", tone: "sky", value: dutyStates.get("in_progress") ?? 0 },
      { label: "Scheduled", tone: "lime", value: dutyStates.get("scheduled") ?? 0 },
      { label: "Missed", tone: "danger", value: dutyStates.get("missed") ?? 0 },
    ] satisfies Slice[],
  };
}

/** The worker's own analytics: tasks closed, duties and pickups (RLS: own rows only). */
export async function getWorkerAnalytics(range: RangeDays) {
  const { db, me } = await getStaffContext(["worker"]);
  const { from, prevFrom, now } = windows(range);
  const [completed, mine, duties, collected] = await Promise.all([
    db.from("report_events").select("report_id, created_at").eq("type", "completed").eq("actor_id", me.id).gte("created_at", iso(prevFrom)),
    db.from("reports").select("status, sla_met, closed_at").eq("assigned_worker_id", me.id),
    db.from("worker_duties").select("status, duty_date, end_time, done_at").eq("worker_id", me.id).gte("duty_date", orgDay(-2 * range)),
    db.from("pickup_events").select("created_at").eq("type", "collected").eq("actor_id", me.id).gte("created_at", iso(prevFrom)),
  ]);
  if (completed.error || mine.error || duties.error || collected.error) throw new Error("Analytics read failed");

  const count = (rows: { created_at: string }[], a: number, b: number) => rows.filter((r) => inWindow(r.created_at, a, b)).length;
  const onTime = (a: number, b: number) => {
    const judged = mine.data.filter((r) => r.status === "closed" && r.sla_met !== null && inWindow(r.closed_at, a, b));
    return percent(judged.filter((r) => r.sla_met).length, judged.length);
  };
  const dutyIn = (a: number, b: number, state: string) =>
    duties.data.filter((d) => d.duty_date >= orgDay(0, a) && d.duty_date < orgDay(0, b) && dutyState(d) === state).length;

  const kpis: Kpi[] = [
    { label: "Tasks completed", value: count(completed.data, from, now), previous: count(completed.data, prevFrom, from), format: "count", better: "up" },
    { label: "Closed on time", value: onTime(from, now), previous: onTime(prevFrom, from), format: "percent", better: "up" },
    { label: "Duties done", value: dutyIn(from, now + 864e5, "done"), previous: dutyIn(prevFrom, from, "done"), format: "count", better: "up" },
    { label: "Duties missed", value: dutyIn(from, now + 864e5, "missed"), previous: dutyIn(prevFrom, from, "missed"), format: "count", better: "down" },
  ];
  if (collected.data.length || me.workerType !== "driver")
    kpis.push({ label: "Pickups collected", value: count(collected.data, from, now), previous: count(collected.data, prevFrom, from), format: "count", better: "up" });

  const days = lastDays(range, now);
  const DONE: Series = { key: "done", label: "Tasks completed", tone: "leaf" };
  const DUTY: Series = { key: "duty", label: "Duties done", tone: "sky" };
  const daily = dailySeries(days, [
    { ...DONE, dates: completed.data.map((e) => e.created_at) },
    { ...DUTY, dates: duties.data.filter((d) => d.status === "done").map((d) => d.done_at) },
  ]);
  const window = duties.data.filter((d) => d.duty_date >= orgDay(-range + 1));
  const states = countBy(window, dutyState);
  return {
    range,
    kpis,
    daily,
    series: [DONE, DUTY],
    duties: [
      { label: "Done", tone: "leaf", value: states.get("done") ?? 0 },
      { label: "In progress", tone: "sky", value: states.get("in_progress") ?? 0 },
      { label: "Scheduled", tone: "lime", value: states.get("scheduled") ?? 0 },
      { label: "Missed", tone: "danger", value: states.get("missed") ?? 0 },
    ] satisfies Slice[],
    tasks: statusSlices(mine.data),
  };
}

/** Supervisor: escalations and service across the organisation. */
export async function getSupervisorAnalytics(range: RangeDays) {
  const { db } = await getStaffContext(["supervisor"]);
  const { from, prevFrom, now } = windows(range);
  const cases = await readOrgCases(db);
  const cur = closedStats(cases, from, now);
  const prev = closedStats(cases, prevFrom, from);
  const created = (a: number, b: number) => cases.filter((c) => inWindow(c.createdAt, a, b)).length;
  const kpis: Kpi[] = [
    { label: "Escalated now", value: cases.filter((c) => c.level >= 1 && c.overdue).length, previous: null, format: "count", better: "down", hint: "Open past the escalation time" },
    { label: "Overdue now", value: cases.filter((c) => c.overdue).length, previous: null, format: "count", better: "down", hint: "Open past the due time" },
    { label: "New reports", value: created(from, now), previous: created(prevFrom, from), format: "count", better: "neutral" },
    { label: "Closed on time", value: cur.onTime, previous: prev.onTime, format: "percent", better: "up" },
  ];
  const days = lastDays(range, now);
  return {
    range,
    kpis,
    daily: dailySeries(days, [
      { ...REPORTED, dates: cases.map((c) => c.createdAt) },
      { ...CLOSED, dates: cases.filter((c) => c.status === "closed").map((c) => c.closedAt) },
    ]),
    series: [REPORTED, CLOSED],
    status: statusSlices(cases),
    areas: stack(progressBy(cases, "areaName")),
    workers: stack(progressBy(cases, "workerName")),
  };
}

/** Higher authority: built only from the level-2 case summaries it may read (no photos, notes or names). */
export async function getAuthorityAnalytics(range: RangeDays) {
  const { cases } = await getAuthorityHome();
  const { from, prevFrom, now } = windows(range);
  const reported: Series = { key: "reported", label: "Level-2 cases reported", tone: "amber" };
  const kpis: Kpi[] = [
    { label: "Level-2 cases", value: cases.length, previous: null, format: "count", better: "down", hint: "Escalated to you now" },
    { label: "Overdue", value: cases.filter((c) => c.overdue).length, previous: null, format: "count", better: "down", hint: "Level-2 cases past the due time" },
    { label: "Areas affected", value: new Set(cases.map((c) => c.areaName ?? "")).size, previous: null, format: "count", better: "down", hint: "Areas with a level-2 case now" },
    { label: "Reported in period", value: cases.filter((c) => inWindow(c.createdAt, from, now)).length,
      previous: cases.filter((c) => inWindow(c.createdAt, prevFrom, from)).length, format: "count", better: "neutral" },
  ];
  return {
    range,
    kpis,
    daily: dailySeries(lastDays(range, now), [{ ...reported, dates: cases.map((c) => c.createdAt) }]),
    series: [reported],
    areas: ranked(countBy(cases, (c) => c.areaName ?? "GPS location"), (k) => k, "amber"),
    issues: ranked(countBy(cases, (c) => c.issueType), (k) => ISSUE_TYPE_LABEL[k] ?? k, "amber"),
  };
}
