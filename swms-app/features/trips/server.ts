// Server-only reads for trips (0900): the driver's running trip.

import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import type { Db } from "@/features/staff/server";
import { createClient } from "@/lib/supabase/server";
import type { MyTrip, TripArea, TripHistoryRow } from "./schema";

/** The logged-in driver's running trip, or null (RLS: drivers read their own trips). */
export async function getMyTrip(): Promise<MyTrip | null> {
  const me = await getCurrentUser();
  if (!me || me.workerType !== "driver") return null;
  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db
    .from("vehicle_trips")
    .select("id, started_at, last_seen_at, vehicles!vehicle_trips_vehicle_id_fkey(number), from:areas!vehicle_trips_from_area_id_org_id_fkey(name), to:areas!vehicle_trips_to_area_id_org_id_fkey(name)")
    .eq("driver_id", me.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (error) throw new Error("Could not load your trip");
  if (!data) return null;
  return {
    id: data.id, vehicleNumber: data.vehicles?.number ?? "Vehicle", startedAt: data.started_at ?? "", lastSeenAt: data.last_seen_at,
    fromArea: data.from?.name ?? null, toArea: data.to?.name ?? null,
  };
}

/** Active areas of the caller's organisation, for the trip's "from" and "to". */
export async function getTripAreas(): Promise<TripArea[]> {
  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db.from("areas").select("id, name").eq("active", true).order("name");
  if (error) throw new Error("Could not load areas");
  return data;
}

/** Trips of the last days with from / to, distance and route size (admins and supervisors; 1100). */
export async function getTripHistory(days = 7): Promise<TripHistoryRow[]> {
  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db.rpc("get_trip_history", { p_days: days });
  if (error) throw new Error("Could not load trips");
  return data.map((t) => ({
    tripId: t.trip_id, vehicleNumber: t.vehicle_number, driverName: t.driver_name, fromArea: t.from_area, toArea: t.to_area,
    status: t.status, startedAt: t.started_at, endedAt: t.ended_at, distanceM: t.distance_m, points: t.points,
  }));
}

/** Route points of one trip in order (RLS: the driver, admins and supervisors). */
export async function getTripRoute(tripId: string): Promise<[number, number][]> {
  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db.from("trip_points").select("lat, lng").eq("trip_id", tripId).order("recorded_at");
  if (error) throw new Error("Could not load the route");
  return data.map((p) => [p.lat, p.lng]);
}
