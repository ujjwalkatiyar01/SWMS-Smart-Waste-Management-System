import type { AiResult } from "./schema";

export async function requestAiSuggestion(photo: Blob): Promise<
  { ok: true; result: AiResult; runId: string } | { ok: false; message: string }
> {
  const form = new FormData();
  form.append("file", photo, "waste.jpg");
  try {
    const response = await fetch("/api/ai/classify", { method: "POST", body: form });
    return await response.json();
  } catch { return { ok: false, message: "AI suggestion is unavailable. Choose a category manually." }; }
}
