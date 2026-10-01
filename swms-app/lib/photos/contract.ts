// Input and result of POST /api/photos (multipart: file, kind = before | after | evidence, reportId for "after" and "evidence").
// "before": the server creates the new report's id. "after": only the assigned worker of an assigned report.
// "evidence": the reporter of the case, or a follower while it is open.

export type ReportPhotoUploadResult =
  | { ok: true; reportId: string; path: string }
  | { ok: false; message: string };

export const UNSUPPORTED_PHOTO = "This file type is not supported. Please take or choose a photo.";
