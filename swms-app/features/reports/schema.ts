// Contract of the resident report actions (03 F3, F4.6): input rules, results and screen data shapes.

import { z } from "zod";
import type { TimelineEvent } from "@/components/shared/Timeline";
import type { FeedbackResult, ReportStatus, Role, Satisfaction } from "@/types/domain";

const coordinate = z.number().finite().nullable();

export const createReportSchema = z.object({
  reportId: z.uuid(),
  photoPath: z.string().min(1, "Add a photo of the problem."),
  issueType: z.enum(
    ["overflowing_bin", "garbage_on_road", "missed_collection", "illegal_dumping", "improper_segregation", "other"],
    "Choose the type of issue.",
  ),
  wasteCategory: z.enum(["wet", "dry", "biomedical", "hazardous", "e_waste", "mixed_uncertain"], "Choose a waste category."),
  aiRunId: z.uuid().nullable(),
  note: z.string().trim().max(1000, "Use 1000 characters or fewer."),
  locationId: z.uuid().nullable(),
  locationSource: z.enum(["gps", "registered", "qr"]),
  lat: coordinate,
  lng: coordinate,
  accuracyM: coordinate,
  /** Raw phone GPS at submit, kept apart from the chosen place (R1). */
  deviceLat: coordinate,
  deviceLng: coordinate,
});

export const feedbackSchema = z.object({
  reportId: z.uuid(),
  feedback: z.enum(["resolved", "partly", "not_resolved"], "Choose one answer."),
  satisfaction: z.enum(["satisfied", "neutral", "unsatisfied"]).nullable(),
  comment: z.string().trim().max(1000, "Use 1000 characters or fewer."),
});

export const reopenSchema = z.object({
  reportId: z.uuid(),
  reason: z.string().trim().min(1, "Tell us what is still wrong.").max(1000, "Use 1000 characters or fewer."),
});

export const evidenceSchema = z
  .object({
    reportId: z.uuid(),
    photoPath: z.string().min(1).nullable(),
    note: z.string().trim().max(1000, "Use 1000 characters or fewer."),
  })
  .refine((e) => e.photoPath !== null || e.note.length > 0, { message: "Add a photo or a note." });

export const followSchema = z.object({ reportId: z.uuid() });

export type CreateReportInput = z.input<typeof createReportSchema>;
export type FeedbackInput = z.input<typeof feedbackSchema>;
export type ReopenInput = z.input<typeof reopenSchema>;
export type EvidenceInput = z.input<typeof evidenceSchema>;

export type CreateReportField = keyof CreateReportInput;

export type CreateReportResult =
  | { ok: true; reportId: string }
  | { ok: false; message?: string; fieldErrors?: Partial<Record<CreateReportField, string>> };

export type FeedbackActionResult = { ok: true } | { ok: false; message: string };

export interface ReportLocation {
  id: string;
  name: string;
  areaName: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ReportFormData {
  locations: ReportLocation[];
  /** Organisation setting: beyond this the phone is "far from this place" (R1, demo 100 m). */
  farFromSiteM: number;
}

export interface MyReport {
  id: string;
  issueType: string;
  status: ReportStatus;
  placeName: string | null;
  createdAt: string;
  dueAt: string;
}

export interface FollowedCase {
  id: string;
  issueType: string;
  status: ReportStatus;
  placeName: string | null;
  dueAt: string;
}

export interface OpenCase {
  /** The open case the resident can follow (duplicate warning, 03 F3.3b). */
  reportId: string;
  status: ReportStatus;
  issueType: string;
  createdAt: string;
}

/** Full case view: reporter, assigned worker, admin, supervisor (P1). */
export interface CaseDetail {
  kind: "full";
  id: string;
  issueType: string;
  wasteCategory: string | null;
  status: ReportStatus;
  note: string | null;
  placeName: string | null;
  areaName: string | null;
  createdAt: string;
  dueAt: string;
  overdue: boolean;
  farFromSite: boolean;
  locationMismatch: boolean;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  completionNote: string | null;
  reporterFirstName: string | null;
  workerFirstName: string | null;
  feedback: FeedbackResult | "none";
  satisfaction: Satisfaction | null;
  events: TimelineEvent[];
  /** Closed and still inside the organisation's reopen window (03 F4.7). */
  canReopen: boolean;
  viewer: { role: Role; isReporter: boolean; isAssignedWorker: boolean };
}

/** Summary view for followers and the higher authority: no photos, notes, feedback or names (P1). */
export interface CaseSummaryView {
  kind: "summary";
  id: string;
  issueType: string;
  status: ReportStatus;
  placeName: string | null;
  areaName: string | null;
  createdAt: string;
  dueAt: string;
  overdue: boolean;
  escalationLevel: number;
  events: TimelineEvent[];
}
