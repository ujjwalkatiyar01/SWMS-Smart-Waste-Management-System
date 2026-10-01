// Sample cases, pickups and related rows for the two demo organisations (03 §11). Times are relative to
// now, so "overdue" always looks right. Needs seed.sql and `npm run seed:users` first.
//   npm run seed:demo             add or refresh the scenario (safe to run again; nothing is deleted)
//   npm run seed:demo -- --reset  FIRST delete every case, pickup and related row of the two demo
//                                 organisations (including test data), then add the scenario
// Scope: only the organisation ids below. Users, places and settings are never changed, except the
// leaderboard choice of two sample residents.

import { createHash } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const ORGS = [
  { key: "A", id: "eb1cf32b-47a8-5ec9-aee6-c241bb18eef8", domain: "citywarda.demo" },
  { key: "B", id: "e3ae7902-1b73-525e-ac82-7a96dfa1e19d", domain: "greenresidency.demo" },
];
const IMAGES = join(process.cwd(), "public/images/issues");
const H = 3_600_000;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Stable id per scenario row, so running again updates the same rows instead of adding copies. */
function id(key: string) {
  const hash = createHash("sha1").update(`swms-demo:${key}`).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const ago = (hours: number) => new Date(Date.now() - hours * H).toISOString();
const ahead = (hours: number) => new Date(Date.now() + hours * H).toISOString();
const day = (offset: number) => new Date(Date.now() + offset * 24 * H).toISOString().slice(0, 10);

function must<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) throw new Error(`${what}: ${result.error?.message ?? "no data"}`);
  return result.data as NonNullable<T>;
}

async function upload(path: string, file: string) {
  const jpeg = await sharp(join(IMAGES, file)).rotate().resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const { error } = await db.storage.from("photos").upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`photo ${path}: ${error.message}`);
}

async function removeFolder(prefix: string) {
  const { data: folders } = await db.storage.from("photos").list(prefix, { limit: 1000 });
  for (const folder of folders ?? []) {
    const { data: files } = await db.storage.from("photos").list(`${prefix}/${folder.name}`, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${prefix}/${folder.name}/${f.name}`);
    if (paths.length) await db.storage.from("photos").remove(paths);
  }
}

async function reset() {
  const orgIds = ORGS.map((o) => o.id);
  // Children first; every table is filtered to the demo organisations only.
  for (const table of [
    "reward_events", "report_followers", "report_events", "notifications", "reports",
    "pickup_events", "pickup_requests", "prevention_reviews", "location_risk",
  ] as const) {
    const { error } = await db.from(table).delete().in("org_id", orgIds);
    if (error) throw new Error(`reset ${table}: ${error.message}`);
    console.log(`cleared  ${table}`);
  }
  for (const org of ORGS) {
    await removeFolder(`${org.id}/reports`);
    await removeFolder(`${org.id}/pickups`);
  }
  console.log("cleared  stored photos");
}

type Who = "r1" | "r2" | "r3" | "w1" | "w2" | "admin" | "sup" | "auth";
interface Step { type: string; hoursAgo: number; by: Who | null; note?: string; data?: object }

interface Case {
  key: string;
  place: number; // index into the organisation's bins/spots, ordered by name
  issue: "overflowing_bin" | "garbage_on_road" | "missed_collection" | "illegal_dumping" | "improper_segregation" | "other";
  waste: "wet" | "dry" | "biomedical" | "hazardous" | "e_waste" | "mixed_uncertain";
  reporter: Who;
  worker?: Who;
  ageHours: number;
  status: string;
  photo: string;
  after?: string;
  note?: string;
  patch?: Record<string, unknown>;
  steps: Step[]; // after the automatic "created" step
  newIncident?: boolean;
}

// Places of City Ward A by name order: 0 Bus stand back lane, 1 Market Lane bin 14, 2 Market square bins,
// 3 Park Gate bins, 4 Railway colony gate, 5 School Road drain side, 6 Station Road corner, 7 Vegetable mandi corner.
const CASES_A: Case[] = [
  { key: "a-new", place: 1, issue: "overflowing_bin", waste: "wet", reporter: "r1", ageHours: 1, status: "submitted", photo: "overflowing-bin.jpg", note: "Bin is full and waste is on the road", newIncident: false, steps: [] },
  { key: "a-assigned", place: 6, issue: "garbage_on_road", waste: "dry", reporter: "r2", worker: "w1", ageHours: 6, status: "assigned", photo: "garbage-on-road.jpg",
    patch: { ai_category: "wet", ai_confidence: "medium", ai_reason: "Looks like food waste", ai_hazard: false },
    steps: [{ type: "assigned", hoursAgo: 5, by: "admin" }] },
  { key: "a-overdue", place: 3, issue: "illegal_dumping", waste: "mixed_uncertain", reporter: "r3", worker: "w2", ageHours: 52, status: "assigned", photo: "illegal-dumping.jpg",
    patch: { overdue_notified: true },
    steps: [{ type: "assigned", hoursAgo: 50, by: "admin" }, { type: "overdue", hoursAgo: 4, by: null }] },
  { key: "a-esc1", place: 0, issue: "overflowing_bin", waste: "wet", reporter: "r2", worker: "w1", ageHours: 58, status: "assigned", photo: "overflowing-bin.jpg",
    patch: { overdue_notified: true, escalated: true, escalation_level: 1 },
    steps: [{ type: "assigned", hoursAgo: 56, by: "admin" }, { type: "overdue", hoursAgo: 34, by: null }, { type: "escalated", hoursAgo: 21, by: null },
      { type: "instruction", hoursAgo: 20, by: "sup", note: "Send a second worker and report back today" }] },
  { key: "a-esc2", place: 5, issue: "illegal_dumping", waste: "hazardous", reporter: "r3", worker: "w2", ageHours: 80, status: "assigned", photo: "illegal-dumping.jpg",
    patch: { overdue_notified: true, escalated: true, escalation_level: 2, ai_category: "hazardous", ai_confidence: "high", ai_hazard: true, ai_reason: "Chemical containers visible" },
    steps: [{ type: "assigned", hoursAgo: 78, by: "admin" }, { type: "overdue", hoursAgo: 66, by: null }, { type: "escalated", hoursAgo: 54, by: null }, { type: "escalated_l2", hoursAgo: 42, by: null }] },
  { key: "a-returned", place: 6, issue: "missed_collection", waste: "dry", reporter: "r1", ageHours: 10, status: "returned", photo: "missed-collection.jpg",
    steps: [{ type: "assigned", hoursAgo: 9, by: "admin" }, { type: "returned", hoursAgo: 7, by: "w1", note: "Road blocked by a parked truck" }] },
  { key: "a-review", place: 3, issue: "garbage_on_road", waste: "dry", reporter: "r2", worker: "w1", ageHours: 9, status: "awaiting_review", photo: "garbage-on-road.jpg", after: "after-swept-road.jpg",
    patch: { attempt_count: 1, far_from_site: true, completion_note: "Swept and collected", completion_lat: 26.48, completion_lng: 80.34 },
    steps: [{ type: "assigned", hoursAgo: 8, by: "admin" }, { type: "completed", hoursAgo: 2, by: "w1", note: "Swept and collected" }] },
  { key: "a-disputed", place: 1, issue: "overflowing_bin", waste: "wet", reporter: "r3", worker: "w1", ageHours: 50, status: "disputed", photo: "overflowing-bin.jpg", after: "after-worker-cart.jpg",
    patch: { attempt_count: 1, completion_note: "Bin emptied", feedback: "partly", feedback_comment: "Still some waste behind the bin", satisfaction: "neutral" },
    steps: [{ type: "assigned", hoursAgo: 48, by: "admin" }, { type: "completed", hoursAgo: 30, by: "w1", note: "Bin emptied" },
      { type: "feedback", hoursAgo: 26, by: "r3", note: "Still some waste behind the bin", data: { feedback: "partly", satisfaction: "neutral", attempt: 1 } },
      { type: "disputed", hoursAgo: 26, by: "r3" }] },
  { key: "a-closed", place: 1, issue: "overflowing_bin", waste: "wet", reporter: "r1", worker: "w1", ageHours: 120, status: "closed", photo: "overflowing-bin.jpg", after: "after-worker-cart.jpg",
    patch: { attempt_count: 1, completion_note: "Emptied and cleaned", feedback: "resolved", satisfaction: "satisfied", closed_at: ago(96), sla_met: true, closed_as_valid: true,
      ai_category: "wet", ai_confidence: "high", ai_hazard: false, ai_reason: "Kitchen waste" },
    steps: [{ type: "assigned", hoursAgo: 118, by: "admin" }, { type: "completed", hoursAgo: 100, by: "w1", note: "Emptied and cleaned" },
      { type: "feedback", hoursAgo: 96, by: "r1", data: { feedback: "resolved", satisfaction: "satisfied", attempt: 1 } }, { type: "closed", hoursAgo: 96, by: "r1" }] },
  { key: "a-noreply", place: 0, issue: "garbage_on_road", waste: "dry", reporter: "r2", worker: "w2", ageHours: 140, status: "closed", photo: "garbage-on-road.jpg", after: "after-swept-road.jpg",
    patch: { attempt_count: 1, completion_note: "Road swept", closed_at: ago(100), sla_met: true, closed_as_valid: false, close_reason: "No reply from the reporter after 24 hours" },
    steps: [{ type: "assigned", hoursAgo: 138, by: "admin" }, { type: "completed", hoursAgo: 130, by: "w2", note: "Road swept" },
      { type: "no_reply", hoursAgo: 100, by: null }, { type: "closed", hoursAgo: 100, by: "admin", note: "No reply from the reporter after 24 hours" }] },
  { key: "a-reopened", place: 1, issue: "overflowing_bin", waste: "wet", reporter: "r2", worker: "w1", ageHours: 70, status: "reopened", photo: "overflowing-bin.jpg", after: "after-worker-cart.jpg",
    patch: { attempt_count: 1, completion_note: "Emptied", feedback: "resolved", satisfaction: "neutral", reopen_count: 1, closed_at: ago(20), sla_met: true, closed_as_valid: true },
    steps: [{ type: "assigned", hoursAgo: 68, by: "admin" }, { type: "completed", hoursAgo: 30, by: "w1", note: "Emptied" },
      { type: "feedback", hoursAgo: 20, by: "r2", data: { feedback: "resolved", satisfaction: "neutral", attempt: 1 } }, { type: "closed", hoursAgo: 20, by: "r2" },
      { type: "reopened", hoursAgo: 6, by: "r2", note: "The bin is overflowing again" }] },
  { key: "a-rejected", place: 6, issue: "other", waste: "mixed_uncertain", reporter: "r3", ageHours: 22, status: "rejected", photo: "improper-segregation.jpg",
    patch: { close_reason: "Duplicate of an existing report" },
    steps: [{ type: "rejected", hoursAgo: 20, by: "admin", note: "Duplicate of an existing report" }] },
];

const CASES_B: Case[] = [
  { key: "b-new", place: 0, issue: "overflowing_bin", waste: "dry", reporter: "r1", ageHours: 3, status: "submitted", photo: "overflowing-bin.jpg", steps: [] },
  { key: "b-assigned", place: 3, issue: "garbage_on_road", waste: "wet", reporter: "r2", worker: "w1", ageHours: 7, status: "assigned", photo: "garbage-on-road.jpg",
    steps: [{ type: "assigned", hoursAgo: 6, by: "admin" }] },
  { key: "b-review", place: 5, issue: "improper_segregation", waste: "mixed_uncertain", reporter: "r3", worker: "w2", ageHours: 12, status: "awaiting_review", photo: "improper-segregation.jpg", after: "after-worker-cart.jpg",
    patch: { attempt_count: 1, completion_note: "Bins sorted" },
    steps: [{ type: "assigned", hoursAgo: 11, by: "admin" }, { type: "completed", hoursAgo: 4, by: "w2", note: "Bins sorted" }] },
  { key: "b-closed", place: 1, issue: "overflowing_bin", waste: "wet", reporter: "r2", worker: "w1", ageHours: 100, status: "closed", photo: "overflowing-bin.jpg", after: "after-worker-cart.jpg",
    patch: { attempt_count: 1, completion_note: "Emptied", feedback: "resolved", satisfaction: "satisfied", closed_at: ago(70), sla_met: true, closed_as_valid: true },
    steps: [{ type: "assigned", hoursAgo: 98, by: "admin" }, { type: "completed", hoursAgo: 75, by: "w1", note: "Emptied" },
      { type: "feedback", hoursAgo: 70, by: "r2", data: { feedback: "resolved", satisfaction: "satisfied", attempt: 1 } }, { type: "closed", hoursAgo: 70, by: "r2" }] },
];

async function main() {
  if (process.argv.includes("--reset")) await reset();

  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => u.email && emails.set(u.email, u.id));
    if (data.users.length < 1000) break;
  }

  for (const org of ORGS) {
    const person = (who: Who): string => {
      const key = { r1: "resident1", r2: "resident2", r3: "resident3", w1: "worker1", w2: "worker2", admin: "admin", sup: "supervisor", auth: "authority" }[who];
      const found = emails.get(`${key}@${org.domain}`);
      if (!found) throw new Error(`Missing ${key}@${org.domain}. Run npm run seed:users first.`);
      return found;
    };
    const settings = must(await db.from("organizations").select("deadline_hours_json, hazardous_deadline_hours, points_per_verified_report, segregation_policy").eq("id", org.id).single(), "organisation");
    const places = must(await db.from("locations").select("id, name, area_id").eq("org_id", org.id).in("kind", ["bin", "spot"]).order("name"), "places");
    const allPlaces = must(await db.from("locations").select("id").eq("org_id", org.id).in("kind", ["bin", "spot"]), "places");
    const hours = (issue: string, waste: string) => {
      const base = (settings.deadline_hours_json as Record<string, number>)[issue] ?? 24;
      return waste === "hazardous" || waste === "biomedical" ? Math.min(base, settings.hazardous_deadline_hours) : base;
    };

    // ---- pickups (before reports: the missed pickup has a linked complaint) ----
    const pickups: { key: string; who: Who; worker?: Who; waste: string; date: number; slot: string; address: string; status: string; extra?: Record<string, unknown>; steps: Step[] }[] = [
      { key: "requested", who: "r1", waste: "dry", date: 2, slot: "morning", address: "Flat 4, Market Road", status: "requested", steps: [{ type: "created", hoursAgo: 3, by: "r1" }] },
      { key: "scheduled", who: "r2", worker: "w2", waste: "wet", date: 1, slot: "afternoon", address: "House 18, Station Road", status: "scheduled",
        steps: [{ type: "created", hoursAgo: 20, by: "r2" }, { type: "scheduled", hoursAgo: 18, by: "admin" }] },
      { key: "rescheduled", who: "r3", worker: "w1", waste: "e_waste", date: 3, slot: "morning", address: "Lane 2, Park Area", status: "scheduled",
        steps: [{ type: "created", hoursAgo: 40, by: "r3" }, { type: "scheduled", hoursAgo: 38, by: "admin" },
          { type: "rescheduled", hoursAgo: 12, by: "admin", data: { old_date: day(1), old_slot: "morning" } }] },
      { key: "collected", who: "r3", worker: "w1", waste: "dry", date: -2, slot: "morning", address: "Lane 2, Park Area", status: "collected", extra: { segregation_ok: true },
        steps: [{ type: "created", hoursAgo: 90, by: "r3" }, { type: "scheduled", hoursAgo: 88, by: "admin" }, { type: "collected", hoursAgo: 50, by: "w1" }] },
      { key: "not_segregated", who: "r1", worker: "w2", waste: "wet", date: -1, slot: "afternoon", address: "Flat 4, Market Road", status: "collected", extra: { segregation_ok: false },
        steps: [{ type: "created", hoursAgo: 60, by: "r1" }, { type: "scheduled", hoursAgo: 58, by: "admin" }, { type: "collected", hoursAgo: 28, by: "w2" },
          { type: "not_segregated", hoursAgo: 28, by: "w2", note: "Waste was not separated" }] },
      { key: "missed", who: "r1", waste: "hazardous", date: -3, slot: "morning", address: "Flat 4, Market Road", status: "missed",
        steps: [{ type: "created", hoursAgo: 120, by: "r1" }, { type: "missed", hoursAgo: 56, by: null, note: "Not scheduled by the preferred date" }] },
      { key: "declined", who: "r2", waste: "hazardous", date: 4, slot: "morning", address: "House 18, Station Road", status: "declined", extra: { decline_reason: "Hazardous waste is collected at the ward office only" },
        steps: [{ type: "created", hoursAgo: 15, by: "r2" }, { type: "declined", hoursAgo: 13, by: "admin", note: "Hazardous waste is collected at the ward office only" }] },
    ];
    const pickupRows = org.key === "A" ? pickups : pickups.filter((p) => ["requested", "scheduled", "collected"].includes(p.key));
    for (const p of pickupRows) {
      const pid = id(`${org.key}-pickup-${p.key}`);
      must(await db.from("pickup_requests").upsert({
        id: pid, org_id: org.id, requester_id: person(p.who), waste_type: p.waste, preferred_date: day(p.date), slot: p.slot, address: p.address,
        status: p.status, assigned_worker_id: p.worker ? person(p.worker) : null, created_at: ago(p.steps[0].hoursAgo), updated_at: ago(p.steps.at(-1)!.hoursAgo),
        ...p.extra,
      }, { onConflict: "id" }).select("id"), `pickup ${p.key}`);
      await db.from("pickup_events").delete().eq("pickup_id", pid);
      must(await db.from("pickup_events").insert(p.steps.map((s) => ({
        org_id: org.id, pickup_id: pid, actor_id: s.by ? person(s.by) : null, type: s.type, note: s.note ?? null,
        old_date: (s.data as { old_date?: string } | undefined)?.old_date ?? null, old_slot: (s.data as { old_slot?: string } | undefined)?.old_slot ?? null,
        created_at: ago(s.hoursAgo),
      }))).select("id"), `pickup events ${p.key}`);
    }

    // ---- cases ----
    const cases = org.key === "A" ? CASES_A : CASES_B;
    for (const c of cases) {
      const rid = id(`${org.key}-${c.key}`);
      const place = places[c.place % places.length];
      const due = new Date(Date.parse(ago(c.ageHours)) + hours(c.issue, c.waste) * H).toISOString();
      const beforePath = `${org.id}/reports/${rid}/before.jpg`;
      const afterPath = c.after ? `${org.id}/reports/${rid}/after.jpg` : null;
      await upload(beforePath, c.photo);
      if (c.after) await upload(afterPath!, c.after);
      must(await db.from("reports").upsert({
        id: rid, org_id: org.id, reporter_id: person(c.reporter), location_id: place.id, issue_type: c.issue, note: c.note ?? null,
        photo_url: beforePath, location_source: "registered", is_new_incident: c.newIncident ?? true, status: c.status,
        assigned_worker_id: c.worker && ["assigned", "awaiting_review", "disputed", "closed", "reopened"].includes(c.status) ? person(c.worker) : null,
        due_at: due, created_at: ago(c.ageHours), waste_category: c.waste, completion_photo_url: afterPath,
        ...c.patch,
      }, { onConflict: "id" }).select("id"), `report ${c.key}`);
      await db.from("report_events").delete().eq("report_id", rid);
      const steps: Step[] = [{ type: "created", hoursAgo: c.ageHours, by: c.reporter }, ...c.steps];
      must(await db.from("report_events").insert(steps.map((s) => ({
        org_id: org.id, report_id: rid, actor_id: s.by ? person(s.by) : null, type: s.type, note: s.note ?? null, data: s.data ?? null,
        photo_url: s.type === "completed" ? afterPath : null, created_at: ago(s.hoursAgo),
      }))).select("id"), `events ${c.key}`);

      if (c.patch?.closed_as_valid === true && c.status !== "rejected") {
        must(await db.from("reward_events").upsert({ org_id: org.id, user_id: person(c.reporter), report_id: rid, points: settings.points_per_verified_report, reason: "verified_report" },
          { onConflict: "report_id,reason" }).select("id"), `reward ${c.key}`);
      }
    }

    // ---- missed pickup → its linked complaint (source missed_pickup, no photo) ----
    if (org.key === "A") {
      const rid = id("A-missed-complaint");
      const pid = id("A-pickup-missed");
      must(await db.from("reports").upsert({
        id: rid, org_id: org.id, reporter_id: person("r1"), location_id: null, issue_type: "missed_collection", note: "Pickup was not collected on the agreed date",
        photo_url: null, source: "missed_pickup", source_pickup_id: pid, status: "submitted", due_at: ahead(10), created_at: ago(56), waste_category: null,
      }, { onConflict: "id" }).select("id"), "missed complaint");
      await db.from("report_events").delete().eq("report_id", rid);
      must(await db.from("report_events").insert({ org_id: org.id, report_id: rid, actor_id: null, type: "created", note: "Created from a missed pickup", created_at: ago(56) }).select("id"), "missed complaint event");

      // A follower on the newest case, and a prevention review for the place with repeat incidents.
      must(await db.from("report_followers").upsert({ org_id: org.id, report_id: id("A-a-new"), user_id: person("r2") }, { onConflict: "report_id,user_id" }).select("id"), "follower");
      const market = places[1];
      await db.from("prevention_reviews").delete().eq("org_id", org.id).eq("location_id", market.id);
      must(await db.from("prevention_reviews").insert({
        org_id: org.id, location_id: market.id, created_by: person("admin"), suspected_cause: "The bin is too small for market-day waste",
        action: "Add a second bin and a market-day pickup", owner_name: "Anil (ward officer)", review_date: day(7), status: "open",
      }).select("id"), "prevention review");
    }

    // ---- routine collection: one vehicle and a morning schedule per area (03 F12) ----
    const vehicleId = id(`${org.key}-vehicle`);
    must(await db.from("vehicles").upsert({ id: vehicleId, org_id: org.id, number: org.key === "A" ? "UP78 AB 1201" : "UP78 CD 3402", kind: "e-rickshaw", default_driver_id: person("w1") },
      { onConflict: "id" }).select("id"), "vehicle");
    const orgAreas = must(await db.from("areas").select("id, name").eq("org_id", org.id).order("name"), "areas");
    for (const [i, area] of orgAreas.entries()) {
      must(await db.from("collection_schedules").upsert({
        id: id(`${org.key}-schedule-${area.name}`), org_id: org.id, area_id: area.id, days_of_week: [1, 2, 3, 4, 5, 6], start_time: i === 1 ? "16:00" : "07:00",
        end_time: i === 1 ? "18:00" : "09:00", waste_type: (["wet", "dry", "mixed"] as const)[i % 3], vehicle_id: vehicleId, driver_id: person("w1"), active: true,
      }, { onConflict: "id" }).select("id"), "schedule");
    }
    // Two sample residents join the area leaderboard (their own choice in a real organisation).
    must(await db.from("users").update({ show_on_leaderboard: true }).in("id", [person("r1"), person("r2")]).select("id"), "leaderboard opt-in");

    // ---- risk scores for tomorrow (prediction from demo data, not validated) ----
    for (const [i, p] of allPlaces.entries()) {
      const score = org.key === "A" ? [78, 62, 55, 41, 37, 29, 18, 9][i % 8] : [44, 38, 25, 20, 12, 8, 5, 3][i % 8];
      must(await db.from("location_risk").upsert({
        org_id: org.id, location_id: p.id, score, computed_for_date: day(1),
        factors_json: { last_7_days: Math.round(score / 20), last_30_days: Math.round(score / 10), weekday_share: 0.3, overdue_open: score > 60 },
      }, { onConflict: "location_id,computed_for_date" }).select("id"), "risk");
    }
    console.log(`seeded   ${org.key} (${cases.length} cases, ${pickupRows.length} pickups)`);
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
