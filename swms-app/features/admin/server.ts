// Server-only reads for the admin dashboard (02-PRD F5, 03 F8). The session client is used, so RLS
// limits every read to the admin's own organisation.

import "server-only";
import { OPEN_STATUSES, feedbackCounts, progressBy, serviceMeasures } from "@/features/staff";
import { getStaffContext, readOrgCases, type Db, type OrgCase } from "@/features/staff/server";
import { z } from "zod";
import type { PickupStatus, ReportStatus } from "@/types/domain";
import type { CaseFilters } from "./schema";

export async function getAdminDashboard() {
  const { db, me } = await getStaffContext(["admin"]);
  const [cases, pickups, org, risk] = await Promise.all([
    readOrgCases(db),
    db.from("pickup_requests").select("id, status, waste_type, preferred_date, slot, address").order("created_at", { ascending: false }),
    db.from("organizations").select("recurrence_threshold, recurrence_window_days").eq("id", me.orgId).single(),
    getPredictedHotspots(db),
  ]);
  if (pickups.error || org.error) throw new Error("Admin dashboard read failed");

  const count = (status: string) => cases.filter((c) => c.status === status).length;
  return {
    counts: {
      submitted: count("submitted"),
      assigned: count("assigned"),
      returned: count("returned"),
      awaitingReview: count("awaiting_review"),
      disputed: count("disputed"),
      overdue: cases.filter((c) => c.overdue).length,
      closed: count("closed"),
      farFromSite: cases.filter((c) => c.farFromSite && c.status === "awaiting_review").length,
    },
    measures: serviceMeasures(cases),
    feedback: feedbackCounts(cases),
    areas: progressBy(cases, "areaName"),
    workers: progressBy(cases, "workerName"),
    pickups: countBy(pickups.data.map((p) => p.status as PickupStatus)),
    recentPickups: pickups.data.slice(0, 8).map((p) => ({ ...p, status: p.status as PickupStatus })),
    overdue: cases.filter((c) => c.overdue).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt)).slice(0, 10),
    topLocations: topLocations(cases, org.data.recurrence_window_days, org.data.recurrence_threshold),
    hotspots: risk,
    recent: cases.slice(0, 8),
    threshold: org.data.recurrence_threshold,
    windowDays: org.data.recurrence_window_days,
  };
}

export async function getActiveWorkers(db: Db) {
  const { data } = await db.from("users").select("id, name").eq("role", "worker").eq("active", true).order("name");
  return data ?? [];
}

// Latest daily risk scores from the hotspot-risk job (05 A5): a prediction from demo data, not validated.
export async function getPredictedHotspots(db: Db) {
  const { data } = await db
    .from("location_risk")
    .select("score, factors_json, computed_for_date, location_id, locations(name)")
    .order("computed_for_date", { ascending: false })
    .order("score", { ascending: false })
    .limit(20);
  const latest = data?.[0]?.computed_for_date;
  return (data ?? [])
    .filter((r) => r.computed_for_date === latest)
    .slice(0, 5)
    .map((r) => {
      const factors = r.factors_json as { last_7_days?: number; last_30_days?: number };
      return { id: r.location_id, name: r.locations?.name ?? "", score: r.score, last7: factors.last_7_days ?? 0, last30: factors.last_30_days ?? 0 };
    });
}

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts].map(([status, count]) => ({ status, count }));
}

// Places ranked by distinct incidents in the last window days; rejected / cancelled reports and reports made
// while a case was already open there do not count (02-PRD F5, R6). The threshold is a demo setting.
function topLocations(cases: OrgCase[], windowDays: number, threshold: number, limit = 5) {
  const since = Date.now() - windowDays * 24 * 36e5;
  const byLocation = new Map<string, { id: string; name: string; incidents: number }>();
  for (const c of cases) {
    if (!c.locationId || !c.newIncident || ["rejected", "cancelled"].includes(c.status)) continue;
    if (Date.parse(c.createdAt) < since) continue;
    const entry = byLocation.get(c.locationId) ?? { id: c.locationId, name: c.placeName, incidents: 0 };
    entry.incidents += 1;
    byLocation.set(c.locationId, entry);
  }
  return [...byLocation.values()]
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, limit)
    .map((l) => ({ ...l, flagged: l.incidents >= threshold }));
}

// Every case of the organisation, filtered for /admin/cases (02-PRD F5: list filtered by status and type).
export async function getAdminCases(filters: CaseFilters) {
  const { db } = await getStaffContext(["admin"]);
  const [cases, areas] = await Promise.all([readOrgCases(db), db.from("areas").select("name").eq("active", true).order("name")]);
  const { status, type, area } = filters;
  const rows = cases.filter(
    (c) =>
      (!status || (status === "overdue" ? c.overdue : status === "far_from_site" ? c.farFromSite : c.status === status)) &&
      (!type || c.issueType === type) &&
      (!area || c.areaName === area),
  );
  return { rows: rows.slice(0, 200), total: rows.length, areaNames: (areas.data ?? []).map((a) => a.name) };
}

// One registered place: its cases, prevention reviews and latest risk score (02-PRD F5, 03 F7.2–7.3).
export async function getLocationHistory(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const { db, me } = await getStaffContext(["admin"]);
  const { data: place } = await db
    .from("locations")
    .select("id, name, kind, lat, lng, areas!locations_area_id_fkey(name)")
    .eq("id", id)
    .maybeSingle();
  if (!place) return null;

  const [cases, reviews, risk, org] = await Promise.all([
    db
      .from("reports")
      .select("id, issue_type, status, created_at, due_at, is_new_incident, waste_category, photo_url")
      .eq("location_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("prevention_reviews")
      .select("id, suspected_cause, action, owner_name, review_date, status, outcome_note, created_at")
      .eq("location_id", id)
      .order("created_at", { ascending: false }),
    db.from("location_risk").select("score, factors_json, computed_for_date").eq("location_id", id).order("computed_for_date", { ascending: false }).limit(1),
    db.from("organizations").select("recurrence_threshold, recurrence_window_days").eq("id", me.orgId).single(),
  ]);
  if (cases.error || reviews.error || org.error) throw new Error("Location read failed");

  const since = Date.now() - org.data.recurrence_window_days * 24 * 36e5;
  const incidents = cases.data.filter(
    (c) => c.is_new_incident && !["rejected", "cancelled"].includes(c.status) && Date.parse(c.created_at) >= since,
  ).length;
  const score = risk.data?.[0];
  return {
    place: { id: place.id, name: place.name, kind: place.kind, areaName: place.areas?.name ?? null },
    cases: cases.data.map((c) => ({
      id: c.id,
      issueType: c.issue_type,
      status: c.status as ReportStatus,
      createdAt: c.created_at,
      dueAt: c.due_at,
      wasteCategory: c.waste_category,
    })),
    reviews: reviews.data,
    incidents,
    threshold: org.data.recurrence_threshold,
    windowDays: org.data.recurrence_window_days,
    risk: score ? { score: score.score, date: score.computed_for_date } : null,
  };
}

// Pins for /admin/map (02-PRD F5): registered places with their open and overdue cases, flags and latest risk,
// plus open reports made from phone GPS only.
export async function getMapData() {
  const { db, me } = await getStaffContext(["admin"]);
  const [places, cases, risk, gps, org] = await Promise.all([
    db.from("locations").select("id, name, kind, lat, lng, areas!locations_area_id_fkey(name)").eq("active", true).not("lat", "is", null),
    readOrgCases(db),
    db.from("location_risk").select("location_id, score, computed_for_date").order("computed_for_date", { ascending: false }).limit(200),
    db.from("reports").select("id, issue_type, status, lat, lng").is("location_id", null).not("lat", "is", null).in("status", [...OPEN_STATUSES, "awaiting_review"]),
    db.from("organizations").select("recurrence_threshold, recurrence_window_days").eq("id", me.orgId).single(),
  ]);
  if (places.error || risk.error || gps.error || org.error) throw new Error("Map read failed");

  const flagged = new Set(topLocations(cases, org.data.recurrence_window_days, org.data.recurrence_threshold, 1000).filter((l) => l.flagged).map((l) => l.id));
  const latestRisk = new Map<string, number>();
  for (const r of risk.data) if (!latestRisk.has(r.location_id)) latestRisk.set(r.location_id, r.score);

  return {
    places: places.data.map((p) => {
      const here = cases.filter((c) => c.locationId === p.id && !["closed", "rejected", "cancelled"].includes(c.status));
      return {
        id: p.id,
        name: p.name,
        kind: p.kind,
        areaName: p.areas?.name ?? null,
        lat: p.lat as number,
        lng: p.lng as number,
        open: here.length,
        overdue: here.filter((c) => c.overdue).length,
        flagged: flagged.has(p.id),
        risk: latestRisk.get(p.id) ?? null,
      };
    }),
    gpsReports: gps.data.map((r) => ({ id: r.id, issueType: r.issue_type, status: r.status as ReportStatus, lat: r.lat as number, lng: r.lng as number })),
  };
}
