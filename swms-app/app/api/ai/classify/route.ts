import { NextResponse } from "next/server";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth/session";
import { classifyWastePhoto, GEMINI_MODEL, type AiResult } from "@/lib/ai";
import { isJpeg } from "@/lib/photos/jpeg";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
type Outcome = { ok: true; result: AiResult; runId: string } | { ok: false; message: string };
function fail(status: number, message: string) {
  return NextResponse.json<Outcome>({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me || !["resident", "admin"].includes(me.role)) return fail(401, "Log in to use the photo suggestion.");
  if (!process.env.GEMINI_API_KEY) return fail(503, "AI suggestion is not configured. Choose a category manually.");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size > 2 * 1024 * 1024 || file.size === 0)
    return fail(400, "Choose a photo smaller than 2 MB.");
  let jpeg: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    if (!isJpeg(input)) return fail(415, "Choose a supported photo.");
    // Re-encode rather than only deleting EXIF segments: provider receives no original metadata.
    jpeg = await sharp(input).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 }).toBuffer();
  } catch { return fail(415, "Choose a supported photo."); }

  const admin = createAdminClient();
  const { data: runId, error: quotaError } = await admin.rpc("reserve_ai_run", { p_user: me.id, p_model: GEMINI_MODEL });
  if (quotaError) return fail(quotaError.message === "AI limit reached" ? 429 : 503,
    quotaError.message === "AI limit reached" ? "AI limit reached for today. Choose a category manually." : "AI suggestion is unavailable. Choose a category manually.");
  const started = Date.now();
  try {
    // Gemini refuses a request deadline under 10 s ("Minimum allowed deadline is 10s").
    const result = await classifyWastePhoto(jpeg, { timeoutMs: 10_000 });
    const { error: saveError } = await admin.from("ai_runs").update({ output_json: result, category: result.category,
      confidence: result.confidence, error: null, latency_ms: Date.now() - started }).eq("id", runId);
    if (saveError) return fail(503, "AI suggestion is unavailable. Choose a category manually.");
    return NextResponse.json<Outcome>({ ok: true, result, runId });
  } catch {
    await admin.from("ai_runs").update({ error: "provider_unavailable", latency_ms: Date.now() - started }).eq("id", runId);
    return fail(503, "AI suggestion is unavailable. Choose a category manually.");
  }
}
