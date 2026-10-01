// Private photo storage (05-STORAGE-PHOTOS; 02-BACKEND §3 admin-client uses 1–2). Only the server
// uploads, deletes and signs; screens receive short-lived signed links, never paths.

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "photos";

export type ReportPhotoKind = "before" | "after";

/** Path rule `<org_id>/reports/<report_id>/<kind>.jpg` — the database functions refuse any other folder (06 S2). */
export function reportPhotoPath(orgId: string, reportId: string, kind: ReportPhotoKind) {
  return `${orgId}/reports/${reportId}/${kind}.jpg`;
}

/** Extra photo on an open case (R4) or a reopening: `<org_id>/reports/<report_id>/evidence-<n>.jpg`. */
export function evidencePhotoPath(orgId: string, reportId: string) {
  return `${orgId}/reports/${reportId}/evidence-${crypto.randomUUID().slice(0, 8)}.jpg`;
}

export function pickupPhotoPath(orgId: string, pickupId: string) {
  return `${orgId}/pickups/${pickupId}/evidence.jpg`;
}

export async function uploadPhoto(path: string, jpeg: Uint8Array) {
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, jpeg, {
    contentType: "image/jpeg",
    upsert: true, // a retried upload for the same report replaces the unsaved file
  });
  if (error) throw new Error("Photo upload failed");
}

/** Removes a file whose database save failed, so nothing is half-saved (03 F3.6). */
export async function deletePhoto(path: string) {
  await createAdminClient().storage.from(BUCKET).remove([path]);
}

/**
 * Signed links for paths the caller has ALREADY proved the user may read (by reading the record
 * with the user client first). Missing paths map to null.
 */
export async function signPhotos(paths: (string | null)[], minutes: number): Promise<(string | null)[]> {
  const wanted = paths.filter((p): p is string => Boolean(p));
  if (wanted.length === 0) return paths.map(() => null);
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrls(wanted, minutes * 60);
  if (error || !data) return paths.map(() => null);
  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return paths.map((p) => (p ? byPath.get(p) ?? null : null));
}
