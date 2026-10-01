// Display names for database codes (06 reports.issue_type, pickup_requests.waste_type).

export const ISSUE_TYPE_LABEL: Record<string, string> = {
  overflowing_bin: "Overflowing bin",
  garbage_on_road: "Garbage on road",
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  improper_segregation: "Improper segregation",
  other: "Other",
};

export const PICKUP_WASTE_LABEL: Record<string, string> = {
  wet: "Wet",
  dry: "Dry",
  hazardous: "Hazardous",
  bulky: "Bulky",
  e_waste: "E-waste",
};

// Statuses that can become overdue and escalate (03 F5.1).
export const OPEN_STATUSES = ["submitted", "assigned", "returned", "disputed", "reopened"] as const;

export function isOverdueStatus(status: string) {
  return (OPEN_STATUSES as readonly string[]).includes(status);
}
