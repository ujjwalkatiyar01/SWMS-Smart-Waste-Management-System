"use client";

// Frontend-preview store: keeps the demo session and cases in this browser
// (localStorage) so the citizen → admin → worker → citizen loop can be shown
// without a backend. Replace with Supabase server actions when the backend exists.

import { useSyncExternalStore } from "react";
import { deadlineHours, firstName, LOCATIONS, seedData, userById } from "./data";
import type {
  CaseEvent,
  DemoData,
  FeedbackResult,
  IssueType,
  LocationSource,
  Report,
  Satisfaction,
  WasteCategory,
} from "./types";

const DATA_KEY = "swms-demo-data-v1";
const SESSION_KEY = "swms-demo-session-v1";

type Snapshot = { data: DemoData; userId: string | null };

let snap: Snapshot | null = null;
const listeners = new Set<() => void>();

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep working in memory for this visit.
  }
}

function load(): Snapshot {
  if (!snap) {
    const data = read<DemoData>(DATA_KEY);
    snap = {
      data: data?.version === 1 ? data : seedData(),
      userId: read<string>(SESSION_KEY),
    };
  }
  return snap;
}

function commit(next: Snapshot) {
  snap = next;
  write(DATA_KEY, next.data);
  write(SESSION_KEY, next.userId);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DATA_KEY || e.key === SESSION_KEY) {
      snap = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Null during server render and hydration; the demo snapshot afterwards. */
export function useDemo() {
  return useSyncExternalStore(subscribe, load, () => null);
}

// ---------- session ----------

export function signIn(userId: string) {
  commit({ ...load(), userId });
}

export function signOut() {
  commit({ ...load(), userId: null });
}

export function resetDemo() {
  commit({ data: seedData(), userId: load().userId });
}

// ---------- case actions (mirror the status-change functions in 06) ----------

function actor() {
  const s = load();
  const u = userById(s.userId ?? undefined);
  if (!u) throw new Error("Not signed in");
  return u;
}

function update(id: string, change: (r: Report) => Report) {
  const s = load();
  commit({
    ...s,
    data: { ...s.data, reports: s.data.reports.map((r) => (r.id === id ? change(r) : r)) },
  });
}

function event(kind: string, note?: string): CaseEvent {
  const u = actor();
  return { at: new Date().toISOString(), actor: u.name.split(" ")[0], role: u.role, kind, note };
}

export function createReport(input: {
  issueType: IssueType;
  category: WasteCategory;
  note: string;
  locationId: string | null;
  locationName: string;
  area: string;
  source: LocationSource;
  photo: string;
}) {
  const s = load();
  const u = actor();
  const now = Date.now();
  const id = `W-${s.data.seq}`;
  const loc = LOCATIONS.find((l) => l.id === input.locationId);
  const report: Report = {
    id,
    issueType: input.issueType,
    category: input.category,
    status: "submitted",
    note: input.note.trim(),
    locationId: input.locationId,
    locationName: input.locationName,
    area: input.area,
    source: input.source,
    beforePhoto: input.photo,
    reporterId: u.id,
    createdAt: new Date(now).toISOString(),
    dueAt: new Date(now + deadlineHours(input.issueType, input.category) * 36e5).toISOString(),
    events: [event("Reported", input.source === "qr" && loc ? `Location from bin QR ${loc.code}` : undefined)],
  };
  commit({ ...s, data: { ...s.data, seq: s.data.seq + 1, reports: [report, ...s.data.reports] } });
  return id;
}

export function assignReport(id: string, workerId: string) {
  update(id, (r) => ({
    ...r,
    status: "assigned",
    workerId,
    events: [...r.events, event("Assigned", `Assigned to ${firstName(workerId)}`)],
  }));
}

export function rejectReport(id: string, reason: string) {
  update(id, (r) => ({ ...r, status: "rejected", events: [...r.events, event("Rejected", reason)] }));
}

export function completeReport(id: string, afterPhoto: string, note: string) {
  update(id, (r) => ({
    ...r,
    status: "awaiting_review",
    afterPhoto,
    events: [...r.events, event("Completed", note.trim() || "After photo added")],
  }));
}

export function returnReport(id: string, reason: string) {
  update(id, (r) => ({
    ...r,
    status: "returned",
    workerId: undefined,
    events: [...r.events, event("Returned", reason)],
  }));
}

export function submitFeedback(id: string, result: FeedbackResult, satisfaction?: Satisfaction, comment?: string) {
  const label = { resolved: "Resolved", partly: "Partly resolved", not_resolved: "Not resolved" }[result];
  update(id, (r) => ({
    ...r,
    status: result === "resolved" ? "closed" : "disputed",
    feedback: { result, satisfaction, comment: comment?.trim() || undefined },
    events: [
      ...r.events,
      event("Feedback", [label, satisfaction && satisfaction[0].toUpperCase() + satisfaction.slice(1), comment?.trim()].filter(Boolean).join(" · ")),
    ],
  }));
}
