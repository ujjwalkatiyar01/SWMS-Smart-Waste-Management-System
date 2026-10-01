// Server-only reads for duties and check-ins (1100). RLS: a worker reads their own rows; admins and
// supervisors read their organisation's.

import "server-only";
import { getStaffContext, type Db } from "@/features/staff/server";
import { getCurrentUser } from "@/lib/auth/session";
import { signPhotos } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";
import { orgClock, orgDay } from "@/lib/time";
import type { AdminDuty, CheckIn, Duty, DutyFormOptions, DutyStatus } from "./schema";

const DUTY_ROW =
  "id, duty_date, start_time, end_time, task, status, started_at, done_at, done_note, photo_url, areas!worker_duties_area_id_org_id_fkey(name), locations!worker_duties_location_id_org_id_fkey(name)";
const PHOTO_MINUTES = 10;

type DutyRow = {
  id: string; duty_date: string; start_time: string; end_time: string; task: string; status: string;
  started_at: string | null; done_at: string | null; done_note: string | null; photo_url: string | null;
  areas: { name: string } | null; locations: { name: string } | null;
};

function statusOf(row: DutyRow, today: string, now: string): DutyStatus {
  const ended = row.duty_date < today || (row.duty_date === today && row.end_time.slice(0, 5) <= now);
  return row.status === "scheduled" && ended ? "missed" : (row.status as DutyStatus);
}

async function toDuties(rows: DutyRow[]): Promise<Duty[]> {
  const today = orgDay();
  const now = orgClock();
  const photos = await signPhotos(rows.map((r) => r.photo_url), PHOTO_MINUTES);
  return rows.map((r, i) => ({
    id: r.id, date: r.duty_date, start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5), task: r.task,
    areaName: r.areas?.name ?? "", placeName: r.locations?.name ?? null, status: statusOf(r, today, now),
    isToday: r.duty_date === today, startedAt: r.started_at, doneAt: r.done_at, doneNote: r.done_note, photoUrl: photos[i],
  }));
}

/** The worker's duties from yesterday to a week ahead, earliest first. */
export async function getMyDuties(): Promise<Duty[]> {
  const me = await getCurrentUser();
  if (!me || me.role !== "worker") return [];
  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db.from("worker_duties").select(DUTY_ROW).eq("worker_id", me.id)
    .neq("status", "cancelled").gte("duty_date", orgDay(-1)).lte("duty_date", orgDay(7))
    .order("duty_date").order("start_time");
  if (error) throw new Error("Could not load your duties");
  return toDuties(data as DutyRow[]);
}

/** The worker's latest check-in today, or null. */
export async function getMyCheckIn(): Promise<CheckIn | null> {
  const me = await getCurrentUser();
  if (!me || me.role !== "worker") return null;
  const db = (await createClient()) as unknown as Db;
  const { data } = await db.from("worker_checkins").select("checked_in_at, areas!worker_checkins_area_id_org_id_fkey(name)")
    .eq("worker_id", me.id).order("checked_in_at", { ascending: false }).limit(1).maybeSingle();
  if (!data || orgDay(0, Date.parse(data.checked_in_at)) !== orgDay()) return null;
  return { areaName: data.areas?.name ?? "", at: data.checked_in_at };
}

/** Duties of one day for the admin, today's check-ins and the form's choices. */
export async function getAdminDuties(day: string) {
  const { db } = await getStaffContext(["admin"]);
  const [duties, checkins, workers, areas, places, risk, open] = await Promise.all([
    db.from("worker_duties").select(`${DUTY_ROW}, users!worker_duties_worker_id_org_id_fkey(name, worker_type)`)
      .eq("duty_date", day).order("start_time"),
    db.from("worker_checkins").select("worker_id, checked_in_at, users!worker_checkins_worker_id_org_id_fkey(name), areas!worker_checkins_area_id_org_id_fkey(name)")
      .gte("checked_in_at", new Date(Date.now() - 36 * 36e5).toISOString()).order("checked_in_at", { ascending: false }),
    db.from("users").select("id, name, worker_type, area_id").eq("role", "worker").eq("active", true).order("name"),
    db.from("areas").select("id, name").eq("active", true).order("name"),
    db.from("locations").select("id, name, area_id").eq("active", true).in("kind", ["bin", "spot"]).order("name"),
    db.from("location_risk").select("location_id, score, computed_for_date").order("computed_for_date", { ascending: false }),
    db.from("reports").select("location_id").not("location_id", "is", null)
      .in("status", ["submitted", "assigned", "returned", "awaiting_review", "disputed", "reopened"]),
  ]);
  if (duties.error || checkins.error || workers.error || areas.error || places.error || risk.error || open.error)
    throw new Error("Could not load duties");

  const rows = duties.data as (DutyRow & { users: { name: string; worker_type: string | null } | null })[];
  const list: AdminDuty[] = (await toDuties(rows)).map((d, i) => ({ ...d, workerName: rows[i].users?.name ?? "", workerType: rows[i].users?.worker_type ?? null }));

  // Latest check-in per worker, today only.
  const today = orgDay();
  const seen = new Set<string>();
  const checkIns: CheckIn[] = [];
  for (const c of checkins.data) {
    if (seen.has(c.worker_id) || orgDay(0, Date.parse(c.checked_in_at)) !== today) continue;
    seen.add(c.worker_id);
    checkIns.push({ workerName: c.users?.name ?? "", areaName: c.areas?.name ?? "", at: c.checked_in_at });
  }

  const latestRisk = new Map<string, number>();
  for (const r of risk.data) if (!latestRisk.has(r.location_id)) latestRisk.set(r.location_id, r.score);
  const openCount = new Map<string, number>();
  for (const r of open.data) if (r.location_id) openCount.set(r.location_id, (openCount.get(r.location_id) ?? 0) + 1);
  const options: DutyFormOptions = {
    workers: workers.data.map((w) => ({ id: w.id, name: w.name, workerType: w.worker_type, areaId: w.area_id })),
    areas: areas.data,
    places: places.data
      .map((p) => ({ id: p.id, name: p.name, areaId: p.area_id, risk: latestRisk.get(p.id) ?? null, open: openCount.get(p.id) ?? 0 }))
      .sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1) || b.open - a.open || a.name.localeCompare(b.name)),
  };
  return { day, duties: list, checkIns, options };
}
