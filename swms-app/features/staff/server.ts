// Server-only helpers shared by the staff screens (worker, admin, supervisor, higher authority).

import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ReportStatus, Role } from "@/types/domain";
import { isOverdueStatus } from "./content/labels";

export type Db = SupabaseClient<Database>;

// Pages and actions re-check the role on the server; proxy redirects are for convenience only (04-AUTH).
export async function getStaffContext(allowed: Exclude<Role, "resident">[]): Promise<{ db: Db; me: CurrentUser }> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!(allowed as Role[]).includes(me.role)) redirect(ROLE_HOME[me.role]);
  // The shared client is not typed with the generated schema yet; the cast adds those types.
  const db = (await createClient()) as unknown as Db;
  return { db, me };
}

// Database message → plain message for the screen (02-BACKEND §4). Full error goes to the server log only.
export function toUserMessage(dbMessage: string | undefined) {
  const message = dbMessage ?? "";
  if (message === "Not allowed") return "You can't do this.";
  if (message.includes("current status")) return "This case has changed. Please refresh.";
  if (message === "Worker not available") return "This worker is not available. Choose another worker.";
  if (message === "After-photo is required") return "Add an after-photo to mark the task done.";
  if (message === "Add a reason") return "Please add a reason.";
  if (message === "Add a reason and a next step") return "Add a reason and a next step.";
  if (message === "Add a photo or a note") return "Add a photo or a note.";
  if (message === "The reopen window has ended") return "The time to reopen this case has ended. Please make a new report.";
  if (message === "This case is not overdue") return "This case is not overdue yet.";
  if (message === "Invalid issue type") return "Choose a valid issue type.";
  if (message === "Invalid photo") return "Photo upload failed. Please try again.";
  if (message.includes("check constraint")) return "Some details are too long or not valid.";
  return "Something went wrong. Please try again.";
}

// Every case of the organisation, flattened for dashboards. Admins and supervisors only (RLS: org-wide read).
export async function readOrgCases(db: Db) {
  const { data, error } = await db
    .from("reports")
    .select(
      "id, status, issue_type, due_at, created_at, closed_at, sla_met, feedback, attempt_count, far_from_site, is_new_incident, escalation_level, location_id, assigned_worker_id, locations!reports_location_id_fkey(name, areas!locations_area_id_fkey(name)), worker:users!reports_assigned_worker_id_fkey(name)",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error("Case read failed");

  const now = Date.now();
  return data.map((r) => ({
    id: r.id,
    status: r.status as ReportStatus,
    issueType: r.issue_type,
    dueAt: r.due_at,
    createdAt: r.created_at,
    closedAt: r.closed_at,
    slaMet: r.sla_met,
    feedback: r.feedback,
    attempts: r.attempt_count,
    farFromSite: r.far_from_site,
    newIncident: r.is_new_incident,
    level: r.escalation_level,
    locationId: r.location_id,
    placeName: r.locations?.name ?? "GPS location",
    areaName: r.locations?.areas?.name ?? null,
    workerId: r.assigned_worker_id,
    workerName: r.worker?.name ?? null,
    overdue: isOverdueStatus(r.status) && Date.parse(r.due_at) < now,
  }));
}

export type OrgCase = Awaited<ReturnType<typeof readOrgCases>>[number];
