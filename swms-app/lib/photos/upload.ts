// Browser helper for POST /api/photos. Returns the stored path to pass to the next server action.

import type { ReportPhotoUploadResult } from "./contract";

export async function uploadReportPhoto(photo: Blob, kind: "before" | "after" | "evidence", reportId?: string): Promise<ReportPhotoUploadResult> {
  const body = new FormData();
  body.append("file", photo, `${kind}.jpg`);
  body.append("kind", kind);
  if (reportId) body.append("reportId", reportId);
  try {
    const res = await fetch("/api/photos", { method: "POST", body });
    return (await res.json()) as ReportPhotoUploadResult;
  } catch {
    return { ok: false, message: "Photo upload failed. Check your connection and try again." };
  }
}
