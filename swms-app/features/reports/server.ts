// Server-only reads for the resident screens. Every read runs as the logged-in user, so the database
// access rules decide what comes back (02-BACKEND §3); photos are signed only after that read succeeds.

import "server-only";
import { redirect } from "next/navigation";
import type { TimelineEvent } from "@/components/shared/Timeline";
import type { Db } from "@/features/staff/server";
import { firstName, getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { signPhotos } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackResult, ReportStatus, Satisfaction } from "@/types/domain";
import { FEEDBACK_OPTIONS, SATISFACTION_OPTIONS } from "./content/labels";
import type { CaseDetail, CaseSummaryView, FollowedCase, MyReport, ReportFormData } from "./schema";

const OPEN: ReportStatus[] = ["submitted", "assigned", "returned", "disputed", "reopened"]; // 03 F4 overdue rule
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function context(): Promise<{ db: Db; me: CurrentUser }> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  return { db: (await createClient()) as unknown as Db, me };
}

function isOverdue(status: ReportStatus, dueAt: string) {
  return OPEN.includes(status) && Date.now() > new Date(dueAt).getTime();
}

export async function getMyReports(): Promise<MyReport[]> {
  const { db, me } = await context();
  const { data, error } = await db
    .from("reports")
    .select("id, issue_type, status, created_at, due_at, locations!reports_location_id_fkey(name)")
    .eq("reporter_id", me.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your reports");
  return data.map((r) => ({
    id: r.id,
    issueType: r.issue_type,
    status: r.status as ReportStatus,
    placeName: r.locations?.name ?? null,
    createdAt: r.created_at,
    dueAt: r.due_at,
  }));
}

/** Open cases the resident follows: summaries only, never photos or names (P1). */
export async function getFollowedCases(): Promise<FollowedCase[]> {
  const { db } = await context();
  const { data: ids } = await db.rpc("followed_cases");
  const summaries = await Promise.all((ids ?? []).slice(0, 10).map((id) => db.rpc("case_summary", { p_report: id })));
  return summaries
    .map((r) => r.data?.[0])
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => ({ id: s.report_id, issueType: s.issue_type, status: s.status as ReportStatus, placeName: s.location_name, dueAt: s.due_at }));
}

/** Registered bins and spots of the user's organisation, and the far-from-site distance, for the report form (03 F3.3). */
export async function getReportFormData(): Promise<ReportFormData> {
  const { db, me } = await context();
  const [places, org] = await Promise.all([
    db.from("locations").select("id, name, lat, lng, areas!locations_area_id_fkey(name)").in("kind", ["bin", "spot"]).eq("active", true).order("name"),
    db.from("organizations").select("far_from_site_m").eq("id", me.orgId).single(),
  ]);
  if (places.error || org.error) throw new Error("Could not load places");
  return {
    locations: places.data.map((l) => ({ id: l.id, name: l.name, areaName: l.areas?.name ?? null, lat: l.lat, lng: l.lng })),
    farFromSiteM: org.data.far_from_site_m,
  };
}

/** Full view if the user may see details, a summary for followers / higher authority, else null (P1). */
export async function getCase(id: string): Promise<CaseDetail | CaseSummaryView | null> {
  const { db, me } = await context();
  if (!UUID.test(id)) return null;

  const { data: r } = await db
    .from("reports")
    .select(
      "id, issue_type, waste_category, status, note, created_at, due_at, far_from_site, location_mismatch, photo_url, completion_photo_url, completion_note, feedback, satisfaction, closed_at, reporter_id, assigned_worker_id, locations!reports_location_id_fkey(name, areas!locations_area_id_fkey(name))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) return getCaseSummary(db, id);

  const [events, people, org] = await Promise.all([
    db.from("report_events").select("id, type, created_at, note, actor_id, data, photo_url").eq("report_id", id).order("created_at"),
    db.rpc("case_people", { p_report: id }),
    db.from("organizations").select("signed_link_minutes, reopen_window_days").eq("id", me.orgId).single(),
  ]);
  const eventRows = events.data ?? [];
  const person = people.data?.[0];

  // Staff names are readable only by admin / supervisor (users_read rule); others see "Staff".
  const staffNames = new Map<string, string>();
  if (me.role === "admin" || me.role === "supervisor") {
    const ids = [...new Set(eventRows.map((e) => e.actor_id).filter((a): a is string => Boolean(a)))];
    const { data: users } = await db.from("users").select("id, name").in("id", ids);
    users?.forEach((u) => staffNames.set(u.id, firstName(u.name)));
  }
  const actorLabel = (actorId: string | null) => {
    if (!actorId) return "System";
    if (actorId === r.reporter_id) return person?.reporter_first_name ?? "Reporter";
    if (actorId === r.assigned_worker_id) return person?.worker_first_name ?? "Worker";
    return staffNames.get(actorId) ?? "Staff";
  };

  // Only extra evidence and reopening photos appear on the timeline; before/after have their own place.
  const eventPhotoPaths = eventRows.map((e) => (EVENT_PHOTO_TYPES.includes(e.type) ? e.photo_url : null));
  const [beforePhotoUrl, afterPhotoUrl, ...eventPhotoUrls] = await signPhotos(
    [r.photo_url, r.completion_photo_url, ...eventPhotoPaths],
    org.data?.signed_link_minutes ?? 10,
  );
  const status = r.status as ReportStatus;
  const isReporter = r.reporter_id === me.id;
  const reopenUntil = r.closed_at ? Date.parse(r.closed_at) + (org.data?.reopen_window_days ?? 0) * 86_400_000 : 0;

  return {
    kind: "full",
    id: r.id,
    issueType: r.issue_type,
    wasteCategory: r.waste_category,
    status,
    note: r.note,
    placeName: r.locations?.name ?? null,
    areaName: r.locations?.areas?.name ?? null,
    createdAt: r.created_at,
    dueAt: r.due_at,
    overdue: isOverdue(status, r.due_at),
    farFromSite: r.far_from_site,
    locationMismatch: r.location_mismatch,
    beforePhotoUrl,
    afterPhotoUrl,
    completionNote: r.completion_note,
    reporterFirstName: person?.reporter_first_name ?? null,
    workerFirstName: person?.worker_first_name ?? null,
    feedback: r.feedback as FeedbackResult | "none",
    satisfaction: r.satisfaction as Satisfaction | null,
    events: eventRows.map(
      (e, i): TimelineEvent => ({
        id: e.id,
        type: e.type,
        at: e.created_at,
        actor: actorLabel(e.actor_id),
        note: eventNote(e),
        photoUrl: eventPhotoUrls[i] ?? null,
      }),
    ),
    canReopen: isReporter && status === "closed" && Date.now() <= reopenUntil,
    viewer: { role: me.role, isReporter, isAssignedWorker: r.assigned_worker_id === me.id },
  };
}

async function getCaseSummary(db: Db, id: string): Promise<CaseSummaryView | null> {
  const { data } = await db.rpc("case_summary", { p_report: id });
  const s = data?.[0];
  if (!s) return null;
  const status = s.status as ReportStatus;
  const types = (s.event_types ?? []) as { type: string; at: string }[];
  return {
    kind: "summary",
    id: s.report_id,
    issueType: s.issue_type,
    status,
    placeName: s.location_name,
    areaName: s.area_name,
    createdAt: s.created_at,
    dueAt: s.due_at,
    overdue: isOverdue(status, s.due_at),
    escalationLevel: s.escalation_level,
    events: types.map((e, i) => ({ id: String(i), type: e.type, at: e.at, actor: "" })),
  };
}

const EVENT_PHOTO_TYPES = ["evidence_added", "reopened"];

function eventNote(e: { type: string; note: string | null; data: unknown }) {
  if (e.type === "feedback") return feedbackNote(e.data, e.note);
  if (e.type === "delay_note") {
    const next = (e.data as { next_step?: string } | null)?.next_step;
    return [e.note, next && `Next: ${next}`].filter(Boolean).join(" · ");
  }
  return e.note;
}

// R2/R3: the feedback event keeps the answer and optional satisfaction in its data column.
function feedbackNote(data: unknown, comment: string | null) {
  const d = (data ?? {}) as { feedback?: string; satisfaction?: string };
  const answer = FEEDBACK_OPTIONS.find((o) => o.value === d.feedback)?.label;
  const satisfaction = SATISFACTION_OPTIONS.find((o) => o.value === d.satisfaction)?.label;
  return [answer, satisfaction, comment].filter(Boolean).join(" · ") || null;
}
