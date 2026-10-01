"use server";

// Resident report actions (03 F3.4, F3.3b, F4.6). The database functions check role, organisation,
// ownership, limits and the allowed status change; these actions validate input and map errors.

import { revalidatePath } from "next/cache";
import { toUserMessage } from "@/features/staff/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePhoto } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";
import { firstErrors } from "@/lib/validation/field-errors";
import type { ActionOutcome } from "@/lib/validation/result";
import type { ReportStatus } from "@/types/domain";
import {
  createReportSchema,
  evidenceSchema,
  feedbackSchema,
  followSchema,
  reopenSchema,
  type CreateReportField,
  type CreateReportInput,
  type CreateReportResult,
  type EvidenceInput,
  type FeedbackActionResult,
  type FeedbackInput,
  type OpenCase,
  type ReopenInput,
} from "./schema";

const LOGIN_AGAIN = "Your session has ended. Please log in again.";

function reportMessage(dbMessage: string | undefined) {
  if (dbMessage === "Daily report limit reached") return "You've reached today's report limit. Please try again tomorrow.";
  if (dbMessage === "Choose a waste category") return "Choose a waste category.";
  return toUserMessage(dbMessage);
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = createReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors<CreateReportField>(parsed.error) };
  const r = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_report", {
    p_id: r.reportId,
    p_issue_type: r.issueType,
    p_photo_url: r.photoPath,
    p_note: r.note || null,
    p_location_id: r.locationId,
    p_lat: r.lat,
    p_lng: r.lng,
    p_accuracy_m: r.accuracyM,
    p_location_source: r.locationSource,
    p_waste_category: r.wasteCategory,
    p_ai_run_id: r.aiRunId,
    p_device_lat: r.deviceLat,
    p_device_lng: r.deviceLng,
  });
  if (error) {
    // A retry with the same report id after a lost response: the report already exists, so keep the photo.
    if (error.code === "23505") return { ok: true, reportId: r.reportId };
    console.error("createReport failed", { userId: me.id, orgId: me.orgId, code: error.code });
    // Nothing half-saved (03 F3.6): remove the photo only if it sits in this new report's folder.
    if (r.photoPath.startsWith(`${me.orgId}/reports/${r.reportId}/`)) await deletePhoto(r.photoPath);
    return { ok: false, message: reportMessage(error.message) };
  }

  revalidatePath("/my");
  return { ok: true, reportId: r.reportId };
}

/** Open cases at a registered place (duplicate warning, 03 F3.3b). Status and type only. */
export async function checkOpenCase(locationId: string): Promise<OpenCase | null> {
  if (!(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("open_case_at", { p_location: locationId });
  const first = (data as { report_id: string; status: ReportStatus; issue_type: string; created_at: string }[] | null)?.[0];
  return first ? { reportId: first.report_id, status: first.status, issueType: first.issue_type, createdAt: first.created_at } : null;
}

/** A printed token resolves through an organisation-scoped database function; the browser never reads QR secrets. */
export async function resolveQr(code: string): Promise<{ id: string; name: string } | null> {
  if (!(await getCurrentUser()) || code.length < 16 || code.length > 80) return null;
  const db = await createClient();
  const { data, error } = await db.rpc("resolve_qr", { p_code: code.trim() });
  if (error) return null;
  const first = data?.[0];
  return first && (first.kind === "bin" || first.kind === "spot") ? { id: first.id, name: first.name } : null;
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const f = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", {
    p_report: f.reportId,
    p_feedback: f.feedback,
    p_comment: f.comment || null,
    p_satisfaction: f.satisfaction,
  });
  if (error) {
    console.error("submitFeedback failed", { userId: me.id, orgId: me.orgId, code: error.code });
    // A second answer after the status changed is refused by the function; show the fresh state.
    return { ok: false, message: error.message === "Not allowed" ? "This case has changed. Please refresh." : reportMessage(error.message) };
  }

  revalidatePath(`/case/${f.reportId}`);
  revalidatePath("/my");
  return { ok: true };
}

// Reporter reopens a closed case inside the reopen window (03 F4.7); later problems are new reports.
export async function reopenReport(input: ReopenInput): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = reopenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_report", { p_report: parsed.data.reportId, p_reason: parsed.data.reason });
  if (error) {
    console.error("reopenReport failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }
  revalidatePath(`/case/${parsed.data.reportId}`);
  revalidatePath("/my");
  revalidatePath("/admin");
  return { ok: true };
}

// Reporter or follower adds a photo or note to an open case without making a new report (R4).
export async function addEvidence(input: EvidenceInput): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { reportId, photoPath, note } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_evidence", { p_report: reportId, p_photo: photoPath, p_note: note });
  if (error) {
    console.error("addEvidence failed", { userId: me.id, orgId: me.orgId, code: error.code });
    // Nothing half-saved (03 F3.6): remove the file only if it sits in this report's evidence folder.
    if (photoPath?.startsWith(`${me.orgId}/reports/${reportId}/evidence-`)) await deletePhoto(photoPath);
    return { ok: false, message: toUserMessage(error.message) };
  }
  revalidatePath(`/case/${reportId}`);
  revalidatePath("/admin");
  return { ok: true };
}

// Follow someone else's open case at a registered place instead of reporting the same problem again (03 F3.3b).
export async function followReport(reportId: string): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = followSchema.safeParse({ reportId });
  if (!parsed.success) return { ok: false, message: "This case could not be found." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("follow_report", { p_report: parsed.data.reportId });
  if (error) {
    console.error("followReport failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: error.message === "Not allowed" ? "You can't follow this case." : toUserMessage(error.message) };
  }
  revalidatePath("/my");
  return { ok: true };
}
