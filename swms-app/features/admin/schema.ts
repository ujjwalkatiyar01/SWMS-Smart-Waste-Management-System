// Input rules for admin case actions (03 F4.1, F4.7, F5.3). The database function re-checks role, organisation and status.

import { z } from "zod";
import { reasonText } from "@/lib/validation/text";

export const assignSchema = z.object({
  reportId: z.uuid("This case could not be found."),
  workerId: z.uuid("Choose a worker."),
});

export type ActionResult = { ok: true; message: string } | { ok: false; message: string } | null;

// Statuses assign_report accepts (06 §8.1).
export const ASSIGNABLE_STATUSES = ["submitted", "assigned", "returned", "disputed", "reopened"] as const;

export type AssignOptions = { workers: { id: string; name: string }[]; currentWorkerId: string | null };

// Case review actions on /case/[id] (03 F5.3): reject, close with a reason, correct a wrong issue type.
export const ISSUE_TYPE_VALUES = [
  "overflowing_bin",
  "garbage_on_road",
  "missed_collection",
  "illegal_dumping",
  "improper_segregation",
  "other",
] as const;

export const rejectSchema = z.object({ reportId: z.uuid(), reason: reasonText });
export const closeSchema = z.object({ reportId: z.uuid(), reason: reasonText, valid: z.boolean() });
export const correctTypeSchema = z.object({ reportId: z.uuid(), issueType: z.enum(ISSUE_TYPE_VALUES, "Choose an issue type.") });

export type RejectInput = z.input<typeof rejectSchema>;
export type CloseInput = z.input<typeof closeSchema>;
export type CorrectTypeInput = z.input<typeof correctTypeSchema>;

// Filters of /admin/cases (03 F8): read from the URL, so anything unknown falls back to "all".
export const CASE_STATUS_FILTERS = [
  "submitted", "assigned", "returned", "awaiting_review", "disputed", "closed", "reopened", "rejected", "overdue", "far_from_site",
] as const;

export interface CaseFilters {
  status?: (typeof CASE_STATUS_FILTERS)[number];
  type?: (typeof ISSUE_TYPE_VALUES)[number];
  area: string;
}

export function parseCaseFilters(params: Record<string, string | string[] | undefined>): CaseFilters {
  const one = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  return {
    status: CASE_STATUS_FILTERS.find((s) => s === one("status")),
    type: ISSUE_TYPE_VALUES.find((t) => t === one("type")),
    area: (one("area") ?? "").slice(0, 80),
  };
}

// Prevention review on /admin/location/[id] (02-PRD F5): cause, action, owner, review date, status, outcome.
export const PREVENTION_ACTIONS = [
  "Pickup frequency",
  "Bin capacity or location",
  "Dumping enforcement",
  "Other",
] as const;

export const reviewSchema = z.object({
  locationId: z.uuid("This place could not be found."),
  cause: z.string().trim().min(1, "Describe the suspected cause.").max(1000, "Use 1000 characters or fewer."),
  action: z.enum(PREVENTION_ACTIONS, "Choose an action."),
  detail: z.string().trim().max(600, "Use 600 characters or fewer."),
  owner: z.string().trim().min(1, "Enter who owns this.").max(100, "Use 100 characters or fewer."),
  reviewDate: z.iso.date("Choose a review date."),
});

export const reviewDoneSchema = z.object({
  reviewId: z.uuid(),
  outcome: z.string().trim().min(1, "Describe the outcome.").max(1000, "Use 1000 characters or fewer."),
});

export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewField = keyof ReviewInput;
export type ReviewDoneInput = z.input<typeof reviewDoneSchema>;
export type ReviewResult = { ok: true } | { ok: false; message?: string; fieldErrors?: Partial<Record<ReviewField, string>> };
