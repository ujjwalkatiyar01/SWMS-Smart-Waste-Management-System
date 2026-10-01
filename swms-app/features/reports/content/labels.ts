// Display names for stored values (06 §3 check constraints).

import type { FeedbackResult, IssueType, Satisfaction, WasteCategory } from "@/types/domain";

export const ISSUE_TYPES: { value: IssueType; label: string }[] = [
  { value: "overflowing_bin", label: "Overflowing bin" },
  { value: "garbage_on_road", label: "Garbage on road" },
  { value: "missed_collection", label: "Missed collection" },
  { value: "illegal_dumping", label: "Illegal dumping" },
  { value: "improper_segregation", label: "Improper segregation / mixed waste" },
  { value: "other", label: "Other" },
];

export const WASTE_CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: "wet", label: "Wet" },
  { value: "dry", label: "Dry" },
  { value: "biomedical", label: "Biomedical" },
  { value: "hazardous", label: "Hazardous" },
  { value: "e_waste", label: "E-waste" },
  { value: "mixed_uncertain", label: "Mixed / not sure" },
];

export const FEEDBACK_OPTIONS: { value: FeedbackResult; label: string }[] = [
  { value: "resolved", label: "Resolved" },
  { value: "partly", label: "Partly resolved" },
  { value: "not_resolved", label: "Not resolved" },
];

export const SATISFACTION_OPTIONS: { value: Satisfaction; label: string }[] = [
  { value: "satisfied", label: "Satisfied" },
  { value: "neutral", label: "Neutral" },
  { value: "unsatisfied", label: "Unsatisfied" },
];

export function issueLabel(value: string) {
  return ISSUE_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function categoryLabel(value: string | null) {
  return WASTE_CATEGORIES.find((c) => c.value === value)?.label ?? "—";
}

/** The due time matters only while the case is still being worked on. */
export function isFinished(status: string) {
  return status === "closed" || status === "cancelled" || status === "rejected";
}
