"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffContext, toUserMessage } from "@/features/staff/server";
import { getActiveWorkers } from "./server";
import { firstErrors } from "@/lib/validation/field-errors";
import type { ActionOutcome } from "@/lib/validation/result";
import {
  ASSIGNABLE_STATUSES,
  assignSchema,
  closeSchema,
  correctTypeSchema,
  reviewDoneSchema,
  reviewSchema,
  rejectSchema,
  type ActionResult,
  type AssignOptions,
  type CloseInput,
  type CorrectTypeInput,
  type ReviewDoneInput,
  type ReviewField,
  type ReviewInput,
  type ReviewResult,
  type RejectInput,
} from "./schema";

// Data for the assign panel on /case/[id]: only when the case is in a status assign_report accepts.
export async function getAssignOptions(reportId: string): Promise<AssignOptions | null> {
  if (!z.uuid().safeParse(reportId).success) return null;
  const { db } = await getStaffContext(["admin", "supervisor"]);
  const [{ data: report }, workers] = await Promise.all([
    db.from("reports").select("status, assigned_worker_id").eq("id", reportId).maybeSingle(),
    getActiveWorkers(db),
  ]);
  if (!report || !(ASSIGNABLE_STATUSES as readonly string[]).includes(report.status)) return null;
  return { workers, currentWorkerId: report.assigned_worker_id };
}

// Assign or reassign a case to a worker. Admins, and supervisors for escalated cases (03 §7);
// assign_report checks role, organisation, allowed status and that the worker is active.
export async function assignReport(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = assignSchema.safeParse({ reportId: formData.get("reportId"), workerId: formData.get("workerId") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { db, me } = await getStaffContext(["admin", "supervisor"]);
  const { error } = await db.rpc("assign_report", { p_report: parsed.data.reportId, p_worker: parsed.data.workerId });
  if (error) {
    console.error("assignReport failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }

  revalidatePath("/admin");
  revalidatePath("/supervisor");
  revalidatePath("/worker");
  revalidatePath(`/case/${parsed.data.reportId}`);
  return { ok: true, message: "Worker assigned." };
}

// Shared by the review actions: map a database error to a plain message, or refresh the pages that show the case.
function reviewOutcome(name: string, me: { id: string; orgId: string }, reportId: string, error: { message: string; code?: string } | null): ActionOutcome {
  if (error) {
    console.error(`${name} failed`, { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }
  revalidatePath("/admin");
  revalidatePath("/my");
  revalidatePath(`/case/${reportId}`);
  return { ok: true };
}

// Admin rejects an invalid, duplicate or out-of-area report while it is still submitted (03 F5.3).
export async function rejectReport(input: RejectInput): Promise<ActionOutcome> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { db, me } = await getStaffContext(["admin"]);
  const { error } = await db.rpc("reject_report", { p_report: parsed.data.reportId, p_reason: parsed.data.reason });
  return reviewOutcome("rejectReport", me, parsed.data.reportId, error);
}

// Admin closes a reviewed or disputed case with a reason; "valid" decides if it counts for rewards (06 D3).
export async function closeReport(input: CloseInput): Promise<ActionOutcome> {
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { db, me } = await getStaffContext(["admin"]);
  const { error } = await db.rpc("close_report", {
    p_report: parsed.data.reportId,
    p_reason: parsed.data.reason,
    p_valid: parsed.data.valid,
  });
  return reviewOutcome("closeReport", me, parsed.data.reportId, error);
}

// Admin corrects a wrong issue type; the due time is recomputed and the change is logged (03 F5.3).
export async function correctIssueType(input: CorrectTypeInput): Promise<ActionOutcome> {
  const parsed = correctTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { db, me } = await getStaffContext(["admin"]);
  const { error } = await db.rpc("correct_issue_type", { p_report: parsed.data.reportId, p_type: parsed.data.issueType });
  return reviewOutcome("correctIssueType", me, parsed.data.reportId, error);
}

// Admin records a prevention review for a place with repeat incidents (02-PRD F5). Row rules allow admins only.
export async function createPreventionReview(input: ReviewInput): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors<ReviewField>(parsed.error) };
  const r = parsed.data;

  const { db, me } = await getStaffContext(["admin"]);
  const { error } = await db.from("prevention_reviews").insert({
    org_id: me.orgId,
    location_id: r.locationId,
    created_by: me.id,
    suspected_cause: r.cause,
    action: r.detail ? `${r.action}: ${r.detail}` : r.action,
    owner_name: r.owner,
    review_date: r.reviewDate,
  });
  if (error) {
    console.error("createPreventionReview failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }
  revalidatePath(`/admin/location/${r.locationId}`);
  revalidatePath("/supervisor");
  return { ok: true };
}

// Admin marks a review done and records what happened.
export async function completePreventionReview(input: ReviewDoneInput): Promise<ActionOutcome> {
  const parsed = reviewDoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { db, me } = await getStaffContext(["admin"]);
  const { data, error } = await db
    .from("prevention_reviews")
    .update({ status: "done", outcome_note: parsed.data.outcome })
    .eq("id", parsed.data.reviewId)
    .select("location_id")
    .maybeSingle();
  if (error || !data) {
    console.error("completePreventionReview failed", { userId: me.id, orgId: me.orgId, code: error?.code });
    return { ok: false, message: toUserMessage(error?.message) };
  }
  revalidatePath(`/admin/location/${data.location_id}`);
  revalidatePath("/supervisor");
  return { ok: true };
}
