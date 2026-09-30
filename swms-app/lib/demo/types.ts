// Frontend-preview types. Names and values follow 06-PHYSICAL-SCHEMA so the
// real Supabase data can replace lib/demo without changing the screens.

export type Role = "resident" | "worker" | "admin";

export type IssueType =
  | "overflowing_bin"
  | "garbage_on_road"
  | "missed_collection"
  | "illegal_dumping"
  | "improper_segregation"
  | "other";

export type WasteCategory = "wet" | "dry" | "biomedical" | "hazardous" | "e_waste" | "mixed_uncertain";

export type ReportStatus =
  | "submitted"
  | "assigned"
  | "awaiting_review"
  | "closed"
  | "disputed"
  | "returned"
  | "rejected"
  | "reopened"
  | "cancelled";

export type LocationSource = "gps" | "qr" | "registered";

export type FeedbackResult = "resolved" | "partly" | "not_resolved";
export type Satisfaction = "satisfied" | "neutral" | "unsatisfied";

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  title: string;
  email: string;
  area: string;
}

export interface DemoLocation {
  id: string;
  /** Code printed under the bin QR (typed-code fallback, 03 F3.3d). */
  code: string;
  name: string;
  area: string;
}

export interface CaseEvent {
  at: string;
  actor: string;
  role: Role | "system";
  kind: string;
  note?: string;
}

export interface Report {
  id: string;
  issueType: IssueType;
  category: WasteCategory;
  status: ReportStatus;
  note: string;
  locationId: string | null;
  locationName: string;
  area: string;
  source: LocationSource;
  beforePhoto: string;
  afterPhoto?: string;
  reporterId: string;
  workerId?: string;
  createdAt: string;
  dueAt: string;
  events: CaseEvent[];
  feedback?: { result: FeedbackResult; satisfaction?: Satisfaction; comment?: string };
}

export type PickupStatus = "requested" | "scheduled" | "collected" | "missed" | "cancelled" | "declined";

export interface Pickup {
  id: string;
  requesterId: string;
  wasteType: string;
  date: string;
  slot: "Morning" | "Afternoon";
  status: PickupStatus;
}

export interface DemoData {
  version: 1;
  seededAt: string;
  seq: number;
  reports: Report[];
  pickups: Pickup[];
}
