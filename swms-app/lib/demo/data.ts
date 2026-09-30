import type {
  DemoData,
  DemoLocation,
  DemoUser,
  IssueType,
  Report,
  ReportStatus,
  Role,
  WasteCategory,
} from "./types";

// Demo organisation (03 §11): "City Ward A" — fictional, sample data only.
export const ORG_NAME = "City Ward A";

export const USERS: DemoUser[] = [
  { id: "u-res-1", name: "Priya Sharma", role: "resident", title: "Citizen", email: "citizen@citywarda.demo", area: "Market Area" },
  { id: "u-res-2", name: "Aman Gupta", role: "resident", title: "Citizen", email: "aman@citywarda.demo", area: "Station Road" },
  { id: "u-adm-1", name: "Anil Verma", role: "admin", title: "Ward officer", email: "admin@citywarda.demo", area: "All areas" },
  { id: "u-wrk-1", name: "Ravi Kumar", role: "worker", title: "Sanitation worker", email: "worker@citywarda.demo", area: "Market Area" },
  { id: "u-wrk-2", name: "Sunita Devi", role: "worker", title: "Sanitation worker", email: "sunita@citywarda.demo", area: "Station Road" },
];

/** One sign-in account per role shown on the login page (frontend preview; no real accounts yet). */
export const LOGIN_ACCOUNTS: Record<Role, string> = {
  resident: "u-res-1",
  admin: "u-adm-1",
  worker: "u-wrk-1",
};
export const PREVIEW_PASSWORD = "demo1234";

export const ROLE_HOME: Record<Role, string> = {
  resident: "/my",
  admin: "/admin",
  worker: "/worker",
};

export const ROLE_LABEL: Record<Role, string> = {
  resident: "Citizen",
  admin: "Administration",
  worker: "Worker",
};

export const LOCATIONS: DemoLocation[] = [
  { id: "loc-1", code: "MKT-014", name: "Market Lane bin 14", area: "Market Area" },
  { id: "loc-2", code: "STN-003", name: "Station Road corner", area: "Station Road" },
  { id: "loc-3", code: "PRK-021", name: "Park Gate bins", area: "Park Area" },
  { id: "loc-4", code: "PRK-008", name: "School Road, drain side", area: "Park Area" },
  { id: "loc-5", code: "STN-011", name: "Bus stand back lane", area: "Station Road" },
];

export const ISSUE_LABEL: Record<IssueType, string> = {
  overflowing_bin: "Overflowing bin",
  garbage_on_road: "Garbage on road",
  missed_collection: "Missed collection",
  illegal_dumping: "Illegal dumping",
  improper_segregation: "Improper segregation",
  other: "Other",
};

export const CATEGORY_LABEL: Record<WasteCategory, string> = {
  wet: "Wet",
  dry: "Dry",
  biomedical: "Biomedical",
  hazardous: "Hazardous",
  e_waste: "E-waste",
  mixed_uncertain: "Mixed / uncertain",
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  submitted: "Submitted",
  assigned: "Assigned",
  awaiting_review: "Awaiting review",
  closed: "Closed",
  disputed: "Disputed",
  returned: "Returned",
  rejected: "Rejected",
  reopened: "Reopened",
  cancelled: "Cancelled",
};

export const OPEN_STATUSES: ReportStatus[] = ["submitted", "assigned", "returned", "disputed", "reopened"];

// Demo deadlines from 06-PHYSICAL-SCHEMA organizations.deadline_hours_json; hazardous 6 h (05 A2).
export const DEADLINE_HOURS: Record<IssueType, number> = {
  overflowing_bin: 12,
  garbage_on_road: 24,
  missed_collection: 12,
  illegal_dumping: 48,
  improper_segregation: 48,
  other: 48,
};
export const HAZARDOUS_DEADLINE_HOURS = 6;

export function deadlineHours(type: IssueType, category: WasteCategory) {
  const base = DEADLINE_HOURS[type];
  return category === "hazardous" || category === "biomedical" ? Math.min(base, HAZARDOUS_DEADLINE_HOURS) : base;
}

export const NEXT_COLLECTION: Record<string, string> = {
  "Market Area": "Tomorrow, 7–9 AM · mixed waste",
  "Station Road": "Today, 4–6 PM · dry waste",
  "Park Area": "Tomorrow, 8–10 AM · wet waste",
};

export const userById = (id?: string) => USERS.find((u) => u.id === id);
export const firstName = (id?: string) => userById(id)?.name.split(" ")[0] ?? "—";

const IMG = "/images/issues";

/** Seed data with times relative to now (G3), so overdue examples always look right. */
export function seedData(now = Date.now()): DemoData {
  const at = (h: number) => new Date(now + h * 36e5).toISOString();
  const loc = (id: string) => LOCATIONS.find((l) => l.id === id)!;

  const make = (r: Omit<Report, "locationName" | "area"> & { locationId: string }): Report => ({
    ...r,
    locationName: loc(r.locationId).name,
    area: loc(r.locationId).area,
  });

  const reports: Report[] = [
    make({
      id: "W-1021", issueType: "overflowing_bin", category: "mixed_uncertain", status: "submitted",
      note: "Bin full since morning, bags on the ground.", locationId: "loc-1", source: "qr",
      beforePhoto: `${IMG}/overflowing-bin.jpg`, reporterId: "u-res-1", createdAt: at(-2), dueAt: at(10),
      events: [{ at: at(-2), actor: "Priya", role: "resident", kind: "Reported", note: "Location from bin QR MKT-014" }],
    }),
    make({
      id: "W-1018", issueType: "garbage_on_road", category: "dry", status: "assigned",
      note: "Pile of plastic and cartons near the corner.", locationId: "loc-2", source: "gps",
      beforePhoto: `${IMG}/garbage-on-road.jpg`, reporterId: "u-res-2", workerId: "u-wrk-2", createdAt: at(-20), dueAt: at(4),
      events: [
        { at: at(-20), actor: "Aman", role: "resident", kind: "Reported" },
        { at: at(-18), actor: "Anil", role: "admin", kind: "Assigned", note: "Assigned to Sunita" },
      ],
    }),
    make({
      id: "W-1015", issueType: "illegal_dumping", category: "mixed_uncertain", status: "assigned",
      note: "Waste dumped behind the school wall.", locationId: "loc-4", source: "gps",
      beforePhoto: `${IMG}/illegal-dumping.jpg`, reporterId: "u-res-1", workerId: "u-wrk-1", createdAt: at(-60), dueAt: at(-12),
      events: [
        { at: at(-60), actor: "Priya", role: "resident", kind: "Reported" },
        { at: at(-57), actor: "Anil", role: "admin", kind: "Assigned", note: "Assigned to Ravi" },
        { at: at(-12), actor: "System", role: "system", kind: "Overdue", note: "Due time passed; admin alerted" },
      ],
    }),
    make({
      id: "W-1012", issueType: "improper_segregation", category: "mixed_uncertain", status: "awaiting_review",
      note: "Food waste and packaging mixed at the park bins.", locationId: "loc-3", source: "registered",
      beforePhoto: `${IMG}/improper-segregation.jpg`, afterPhoto: `${IMG}/after-worker-cart.jpg`,
      reporterId: "u-res-1", workerId: "u-wrk-1", createdAt: at(-30), dueAt: at(18),
      events: [
        { at: at(-30), actor: "Priya", role: "resident", kind: "Reported" },
        { at: at(-28), actor: "Anil", role: "admin", kind: "Assigned", note: "Assigned to Ravi" },
        { at: at(-3), actor: "Ravi", role: "worker", kind: "Completed", note: "Separated and collected; after photo added" },
      ],
    }),
    make({
      id: "W-1009", issueType: "missed_collection", category: "mixed_uncertain", status: "closed",
      note: "Morning collection did not come.", locationId: "loc-5", source: "registered",
      beforePhoto: `${IMG}/missed-collection.jpg`, afterPhoto: `${IMG}/after-swept-road.jpg`,
      reporterId: "u-res-2", workerId: "u-wrk-2", createdAt: at(-120), dueAt: at(-108),
      feedback: { result: "resolved", satisfaction: "satisfied" },
      events: [
        { at: at(-120), actor: "Aman", role: "resident", kind: "Reported" },
        { at: at(-119), actor: "Anil", role: "admin", kind: "Assigned", note: "Assigned to Sunita" },
        { at: at(-111), actor: "Sunita", role: "worker", kind: "Completed" },
        { at: at(-110), actor: "Aman", role: "resident", kind: "Feedback", note: "Resolved · Satisfied" },
      ],
    }),
    make({
      id: "W-1006", issueType: "overflowing_bin", category: "mixed_uncertain", status: "disputed",
      note: "Overflowing again after the weekend.", locationId: "loc-1", source: "qr",
      beforePhoto: `${IMG}/overflowing-bin.jpg`, afterPhoto: `${IMG}/after-worker-cart.jpg`,
      reporterId: "u-res-2", workerId: "u-wrk-1", createdAt: at(-80), dueAt: at(-68),
      feedback: { result: "partly", comment: "Bags cleared but the bin is still full." },
      events: [
        { at: at(-80), actor: "Aman", role: "resident", kind: "Reported" },
        { at: at(-78), actor: "Anil", role: "admin", kind: "Assigned", note: "Assigned to Ravi" },
        { at: at(-70), actor: "Ravi", role: "worker", kind: "Completed" },
        { at: at(-66), actor: "Aman", role: "resident", kind: "Feedback", note: "Partly resolved: bin still full" },
      ],
    }),
    make({
      id: "W-1003", issueType: "overflowing_bin", category: "mixed_uncertain", status: "closed",
      note: "Bin overflowing onto the lane.", locationId: "loc-1", source: "qr",
      beforePhoto: `${IMG}/overflowing-bin.jpg`, afterPhoto: `${IMG}/after-swept-road.jpg`,
      reporterId: "u-res-1", workerId: "u-wrk-1", createdAt: at(-290), dueAt: at(-278),
      feedback: { result: "resolved", satisfaction: "neutral" },
      events: [
        { at: at(-290), actor: "Priya", role: "resident", kind: "Reported" },
        { at: at(-288), actor: "Anil", role: "admin", kind: "Assigned", note: "Assigned to Ravi" },
        { at: at(-281), actor: "Ravi", role: "worker", kind: "Completed" },
        { at: at(-279), actor: "Priya", role: "resident", kind: "Feedback", note: "Resolved · Neutral" },
      ],
    }),
  ];

  return {
    version: 1,
    seededAt: new Date(now).toISOString(),
    seq: 1022,
    reports,
    pickups: [
      { id: "P-201", requesterId: "u-res-1", wasteType: "Bulky: old furniture", date: at(20), slot: "Morning", status: "scheduled" },
      { id: "P-198", requesterId: "u-res-1", wasteType: "E-waste: old phone and cables", date: at(-150), slot: "Afternoon", status: "collected" },
    ],
  };
}
