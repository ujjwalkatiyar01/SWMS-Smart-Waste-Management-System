"use server";

// Driver trip actions and the live-vehicle read used for polling (0900). The database functions check
// that the caller is an active driver, the vehicle code belongs to their organisation and the trip is theirs.

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import type { Db } from "@/features/staff/server";
import { createClient } from "@/lib/supabase/server";
import type { ActionOutcome } from "@/lib/validation/result";
import {
  endTripSchema,
  positionSchema,
  startTripSchema,
  type EndTripInput,
  type LiveVehicle,
  type PositionInput,
  type StartTripInput,
  type StartTripResult,
} from "./schema";

const LOGIN_AGAIN = "Your session has ended. Please log in again.";

function tripMessage(dbMessage: string | undefined) {
  switch (dbMessage) {
    case "Only a driver can start a trip": return "Only a worker registered as a driver can start a trip.";
    case "Vehicle code not recognised": return "This code doesn't match an active vehicle of your organisation.";
    case "You already have a trip running": return "You already have a trip running on another vehicle. End it first.";
    case "This vehicle is already on a trip": return "Another driver is already on a trip with this vehicle.";
    case "This trip has ended": return "This trip has ended.";
    case "Choose where the trip starts and where it goes": return "Choose where the trip starts and where it is going.";
    default: return "Could not update the trip. Please try again.";
  }
}

export async function startTrip(input: StartTripInput): Promise<StartTripResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = startTripSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { code, scanMethod, fromAreaId, toAreaId, position } = parsed.data;

  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db.rpc("start_trip", {
    p_code: code, p_scan_method: scanMethod, p_from_area: fromAreaId, p_to_area: toAreaId,
    p_lat: position?.lat, p_lng: position?.lng, p_accuracy_m: position?.accuracyM ?? undefined,
  });
  if (error || !data) {
    console.error("startTrip failed", { userId: me.id, orgId: me.orgId, code: error?.code });
    return { ok: false, message: tripMessage(error?.message) };
  }
  revalidatePath("/worker");
  return { ok: true, tripId: data };
}

export async function sendTripPosition(input: PositionInput): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid position." };
  const p = parsed.data;
  const db = (await createClient()) as unknown as Db;
  const { error } = await db.rpc("update_trip_position", { p_trip: p.tripId, p_lat: p.lat, p_lng: p.lng, p_accuracy_m: p.accuracyM ?? undefined });
  return error ? { ok: false, message: tripMessage(error.message) } : { ok: true };
}

export async function endTrip(input: EndTripInput): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = endTripSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "This trip could not be found." };
  const { tripId, position } = parsed.data;
  const db = (await createClient()) as unknown as Db;
  const { error } = await db.rpc("end_trip", { p_trip: tripId, p_lat: position?.lat, p_lng: position?.lng });
  if (error) {
    console.error("endTrip failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: tripMessage(error.message) };
  }
  revalidatePath("/worker");
  return { ok: true };
}

/** Running vehicles of the caller's organisation (refreshed by the map every few seconds). */
export async function getLiveVehicles(): Promise<LiveVehicle[]> {
  if (!(await getCurrentUser())) return [];
  const db = (await createClient()) as unknown as Db;
  const { data, error } = await db.rpc("get_live_vehicles");
  if (error) throw new Error("Could not load vehicles");
  return data.map((v) => ({
    tripId: v.trip_id, vehicleNumber: v.vehicle_number, vehicleKind: v.vehicle_kind, driverFirstName: v.driver_first_name,
    lat: v.lat, lng: v.lng, accuracyM: v.accuracy_m, lastSeenAt: v.last_seen_at, isMine: v.is_mine,
    fromArea: v.from_area, toArea: v.to_area,
  }));
}
