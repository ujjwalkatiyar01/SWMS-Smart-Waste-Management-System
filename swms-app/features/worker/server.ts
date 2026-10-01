// Server-only reads for the Worker / Driver screens (02-PRD F4 worker dashboard, 03 F4.3, F8).
// RLS lets a worker read only reports assigned to them.

import "server-only";
import { z } from "zod";
import { getStaffContext } from "@/features/staff/server";
import { ORG_TIME_ZONE } from "@/lib/time";
import type { PickupStatus, ReportStatus } from "@/types/domain";

const TASK_ROW =
  "id, status, issue_type, due_at, locations!reports_location_id_fkey(name, area_id, areas!locations_area_id_fkey(name))";

const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: ORG_TIME_ZONE });

export async function getWorkerHome(areaParam: string | undefined) {
  const { db, me } = await getStaffContext(["worker"]);
  const areaId = z.uuid().safeParse(areaParam).success ? areaParam : undefined;
  // "Today" is the organisation's local day (03 §3); 36 h back always covers it.
  const since = new Date(Date.now() - 36 * 36e5).toISOString();

  const [open, completedEvents, areas, pickups] = await Promise.all([
    db.from("reports").select(TASK_ROW).eq("assigned_worker_id", me.id).eq("status", "assigned").order("due_at"),
    db.from("report_events").select("report_id, created_at").eq("type", "completed").eq("actor_id", me.id).gte("created_at", since),
    db.from("areas").select("id, name").eq("active", true).order("name"),
    db
      .from("pickup_requests")
      .select("id, status, waste_type, preferred_date, slot, address")
      .eq("assigned_worker_id", me.id)
      .eq("status", "scheduled")
      .order("preferred_date"),
  ]);
  if (open.error || completedEvents.error || areas.error || pickups.error) throw new Error("Worker home read failed");

  const today = localDay.format(new Date());
  const doneIds = [
    ...new Set(completedEvents.data.filter((e) => localDay.format(new Date(e.created_at)) === today).map((e) => e.report_id)),
  ];
  const { data: done } = doneIds.length
    ? await db.from("reports").select(TASK_ROW).in("id", doneIds).order("due_at")
    : { data: [] };

  const toTask = (r: NonNullable<typeof done>[number]) => ({
    id: r.id,
    status: r.status as ReportStatus,
    issueType: r.issue_type,
    dueAt: r.due_at,
    areaId: r.locations?.area_id ?? null,
    placeName: r.locations?.name ?? "GPS location",
    areaName: r.locations?.areas?.name ?? null,
  });
  const inArea = (t: ReturnType<typeof toTask>) => !areaId || t.areaId === areaId;
  const todo = open.data.map(toTask).filter(inArea);
  const doneToday = (done ?? []).map(toTask).filter(inArea);
  const now = Date.now();

  return {
    name: me.name,
    areas: areas.data,
    areaId,
    counts: {
      assigned: todo.length + doneToday.length,
      done: doneToday.length,
      remaining: todo.length,
      overdue: todo.filter((t) => Date.parse(t.dueAt) < now).length,
    },
    todo,
    doneToday,
    // Shown for reference; collecting a pickup is a separate flow (03 F6) not built here.
    pickups: pickups.data.map((p) => ({ ...p, status: p.status as PickupStatus })),
  };
}
