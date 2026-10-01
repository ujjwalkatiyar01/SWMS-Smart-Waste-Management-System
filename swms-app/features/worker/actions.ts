"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffContext, toUserMessage } from "@/features/staff/server";
import { deletePhoto } from "@/lib/photos/storage";
import type { ActionOutcome } from "@/lib/validation/result";
import { completeSchema, returnSchema, type CompleteInput, type CompleteResult, type ReturnInput, type TaskState } from "./schema";

// What the completion panel shows for this report: the form (assigned to me), the result (done), or nothing.
export async function getTaskState(reportId: string): Promise<TaskState> {
  if (!z.uuid().safeParse(reportId).success) return { kind: "none" };
  const { db, me } = await getStaffContext(["worker"]);
  const { data: report } = await db
    .from("reports")
    .select("status, assigned_worker_id, far_from_site")
    .eq("id", reportId)
    .maybeSingle();
  if (!report || report.assigned_worker_id !== me.id) return { kind: "none" };
  if (report.status === "assigned") return { kind: "complete" };
  if (report.status === "awaiting_review") return { kind: "done", farFromSite: report.far_from_site };
  return { kind: "none" };
}

// Worker marks a task done: after-photo (already uploaded by /api/photos) + note + GPS → awaiting_review (03 F4.4).
export async function completeTask(input: CompleteInput): Promise<CompleteResult> {
  const parsed = completeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { reportId, photoPath, note, lat, lng } = parsed.data;

  const { db, me } = await getStaffContext(["worker"]);
  const { error } = await db.rpc("complete_report", {
    p_report: reportId,
    p_photo_url: photoPath,
    p_note: note,
    // Types are generated as non-null; the function accepts null when GPS was not shared (no distance check).
    p_lat: lat as number,
    p_lng: lng as number,
  });
  if (error) {
    console.error("completeTask failed", { userId: me.id, orgId: me.orgId, code: error.code });
    // Nothing half-saved (03 F3.6); only delete a file inside this report's folder.
    if (photoPath === `${me.orgId}/reports/${reportId}/after.jpg`) await deletePhoto(photoPath);
    return { ok: false, message: toUserMessage(error.message) };
  }

  revalidatePath("/worker");
  revalidatePath("/admin");
  revalidatePath(`/case/${reportId}`);
  return { ok: true };
}

// Worker gives the task back with a reason (site blocked, needs equipment, wrong location); the due time stays (03 F4.5).
export async function returnTask(input: ReturnInput): Promise<ActionOutcome> {
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { db, me } = await getStaffContext(["worker"]);
  const { error } = await db.rpc("return_report", { p_report: parsed.data.reportId, p_reason: parsed.data.reason });
  if (error) {
    console.error("returnTask failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }

  // The case page is not revalidated here: the worker no longer has access, and refreshing it inside this
  // response would replace the confirmation with "Case not found". Others load it fresh (dynamic page).
  revalidatePath("/worker");
  revalidatePath("/admin");
  return { ok: true };
}
