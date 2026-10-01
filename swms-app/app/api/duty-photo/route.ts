// POST /api/duty-photo — stores the after-photo of a duty privately (1100). Only the worker of a duty
// that is in progress; complete_duty re-checks the path when the photo is attached.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { UNSUPPORTED_PHOTO } from "@/lib/photos/contract";
import { isJpeg, stripJpegMetadata } from "@/lib/photos/jpeg";
import { dutyPhotoPath, uploadPhoto } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, message: string) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return fail(401, "Please log in again.");
  const form = await request.formData().catch(() => null);
  const id = form?.get("dutyId");
  const file = form?.get("file");
  if (typeof id !== "string" || !UUID.test(id) || !(file instanceof File)) return fail(400, "Photo upload failed. Please try again.");
  if (file.size > 2 * 1024 * 1024) return fail(413, "This photo is too large. Please choose another one.");

  const db = await createClient();
  const { data: duty } = await db.from("worker_duties").select("id, status, worker_id").eq("id", id).maybeSingle();
  if (!duty || duty.worker_id !== me.id || duty.status !== "in_progress") return fail(403, "You can't do this.");

  let jpeg: Uint8Array;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(bytes)) return fail(415, UNSUPPORTED_PHOTO);
    jpeg = stripJpegMetadata(bytes);
  } catch {
    return fail(415, UNSUPPORTED_PHOTO);
  }
  const path = dutyPhotoPath(me.orgId, id);
  try {
    await uploadPhoto(path, jpeg);
  } catch {
    return fail(502, "Photo upload failed. Please try again.");
  }
  return NextResponse.json({ ok: true, path });
}
