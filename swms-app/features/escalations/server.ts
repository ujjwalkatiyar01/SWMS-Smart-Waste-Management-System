// Server-only reads for the escalation screens (02-PRD F5 supervisor dashboard, F9; 03 F5.2 / F5.2b).

import "server-only";
import { getActiveWorkers, getPredictedHotspots } from "@/features/admin/server";
import { feedbackCounts, isOverdueStatus, progressBy, serviceMeasures } from "@/features/staff";
import { getStaffContext, readOrgCases } from "@/features/staff/server";
import type { ReportStatus } from "@/types/domain";

export async function getSupervisorHome() {
  const { db } = await getStaffContext(["supervisor"]);
  const [cases, workers, reviews] = await Promise.all([
    readOrgCases(db),
    getActiveWorkers(db),
    db
      .from("prevention_reviews")
      .select("id, suspected_cause, action, owner_name, review_date, status, locations!prevention_reviews_location_id_fkey(name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    workers,
    // Level 1 and above: still open past due + escalation hours (demo 12 h).
    escalated: cases
      .filter((c) => c.level >= 1 && isOverdueStatus(c.status))
      .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)),
    areas: progressBy(cases, "areaName"),
    byWorker: progressBy(cases, "workerName"),
    measures: serviceMeasures(cases),
    feedback: feedbackCounts(cases),
    reviews: (reviews.data ?? []).map((r) => ({ ...r, placeName: r.locations?.name ?? "" })),
  };
}

// Level 2: summaries only — no photos, notes, feedback or names (P1, 06 §8.1c).
export async function getAuthorityHome() {
  const { db } = await getStaffContext(["higher_authority"]);
  const { data: ids, error } = await db.rpc("authority_cases");
  if (error) throw new Error("Authority queue read failed");

  const [summaries, hotspots] = await Promise.all([
    Promise.all(ids.map(async (id) => (await db.rpc("case_summary", { p_report: id }).maybeSingle()).data)),
    getPredictedHotspots(db),
  ]);
  const cases = summaries
    .filter((s) => s !== null)
    .map((s) => ({
      id: s.report_id,
      status: s.status as ReportStatus,
      issueType: s.issue_type,
      placeName: s.location_name ?? "GPS location",
      areaName: s.area_name,
      createdAt: s.created_at,
      dueAt: s.due_at,
      overdue: s.overdue,
      eventTypes: ((s.event_types ?? []) as { type: string }[]).map((e) => e.type),
    }))
    .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
  return { cases, hotspots };
}
