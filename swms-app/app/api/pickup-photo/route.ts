import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isJpeg, stripJpegMetadata } from "@/lib/photos/jpeg";
import { pickupPhotoPath, uploadPhoto } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, message: "Please log in again." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const id = form?.get("pickupId");
  const file = form?.get("file");
  if (typeof id !== "string" || !UUID.test(id) || !(file instanceof File))
    return NextResponse.json({ ok: false, message: "Choose a valid pickup and photo." }, { status: 400 });
  if (file.size > 2 * 1024 * 1024)
    return NextResponse.json({ ok: false, message: "This photo is too large." }, { status: 413 });
  const db = await createClient();
  const { data: pickup } = await db.from("pickup_requests")
    .select("id, status, assigned_worker_id").eq("id", id).maybeSingle();
  if (!pickup || pickup.status !== "scheduled" || (me.role !== "admin" &&
      !(me.role === "worker" && pickup.assigned_worker_id === me.id)))
    return NextResponse.json({ ok: false, message: "You can't update this pickup." }, { status: 403 });
  let jpeg: Uint8Array;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isJpeg(bytes)) throw new Error("Invalid JPEG");
    jpeg = stripJpegMetadata(bytes);
  } catch {
    return NextResponse.json({ ok: false, message: "Choose a supported photo." }, { status: 415 });
  }
  const path = pickupPhotoPath(me.orgId, id);
  try { await uploadPhoto(path, jpeg); }
  catch { return NextResponse.json({ ok: false, message: "Photo upload failed." }, { status: 502 }); }
  return NextResponse.json({ ok: true, path });
}
