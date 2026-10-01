// POST /api/photos — stores one report photo privately (02-BACKEND §6, 05-STORAGE-PHOTOS).
// Contract: lib/photos/contract.ts. The database functions re-check the path and the user when the
// photo is attached (create_report / complete_report).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { UNSUPPORTED_PHOTO, type ReportPhotoUploadResult } from "@/lib/photos/contract";
import { isJpeg, stripJpegMetadata } from "@/lib/photos/jpeg";
import { evidencePhotoPath, reportPhotoPath, uploadPhoto } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // bucket limit; the browser already resizes to about 1 MB
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, message: string) {
  return NextResponse.json<ReportPhotoUploadResult>({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "Please log in again.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Photo upload failed. Please try again.");
  }
  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File) || (kind !== "before" && kind !== "after" && kind !== "evidence")) return fail(400, "Photo upload failed. Please try again.");
  if (file.size > MAX_BYTES) return fail(413, "This photo is too large. Please choose another one.");

  let jpeg: Uint8Array;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(bytes)) return fail(415, UNSUPPORTED_PHOTO);
    jpeg = stripJpegMetadata(bytes);
  } catch {
    return fail(415, UNSUPPORTED_PHOTO);
  }

  let reportId: string;
  let path: string;
  if (kind === "before") {
    if (user.role !== "resident" && user.role !== "admin") return fail(403, "You can't do this.");
    reportId = crypto.randomUUID(); // 02-BACKEND §6: the server creates the report id first
    path = reportPhotoPath(user.orgId, reportId, "before");
  } else if (kind === "evidence") {
    // Only the reporter, or a follower while the case is open (R4); add_evidence / reopen_report re-check.
    const requested = form.get("reportId");
    if (typeof requested !== "string" || !UUID.test(requested)) return fail(400, "Photo upload failed. Please try again.");
    const supabase = await createClient();
    const { data: own } = await supabase.from("reports").select("id, status, reporter_id").eq("id", requested).maybeSingle();
    let allowed = own?.reporter_id === user.id && own.status !== "cancelled" && own.status !== "rejected";
    if (!allowed) {
      const [{ data: followed }, { data: summary }] = await Promise.all([
        supabase.rpc("followed_cases"),
        supabase.rpc("case_summary", { p_report: requested }),
      ]);
      const status = summary?.[0]?.status;
      allowed = Boolean(followed?.includes(requested)) && status !== undefined && !["closed", "cancelled", "rejected"].includes(status);
    }
    if (!allowed) return fail(403, "You can't do this.");
    reportId = requested;
    path = evidencePhotoPath(user.orgId, reportId);
  } else {
    const requested = form.get("reportId");
    if (typeof requested !== "string" || !UUID.test(requested)) return fail(400, "Photo upload failed. Please try again.");
    const supabase = await createClient();
    const { data: report } = await supabase
      .from("reports")
      .select("id, status, assigned_worker_id")
      .eq("id", requested)
      .maybeSingle();
    if (!report || report.assigned_worker_id !== user.id || report.status !== "assigned") {
      return fail(403, "You can't do this.");
    }
    reportId = report.id;
    path = reportPhotoPath(user.orgId, reportId, "after");
  }

  try {
    await uploadPhoto(path, jpeg);
  } catch {
    return fail(502, "Photo upload failed. Please try again.");
  }
  return NextResponse.json<ReportPhotoUploadResult>({ ok: true, reportId, path });
}
