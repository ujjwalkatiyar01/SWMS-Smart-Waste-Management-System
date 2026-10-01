import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { signPhotos } from "@/lib/photos/storage";
import type { PickupStatus } from "@/types/domain";
import { pickupIdSchema, type PickupDetail, type PickupListItem } from "./schema";

export async function getMyPickups(): Promise<PickupListItem[]> {
  const me = await getCurrentUser();
  if (!me) return [];
  const db = await createClient();
  const { data, error } = await db.from("pickup_requests")
    .select("id, waste_type, status, preferred_date, slot, address")
    .eq("requester_id", me.id).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load pickups");
  return data.map((p) => ({ id: p.id, wasteType: p.waste_type, status: p.status as PickupStatus,
    preferredDate: p.preferred_date, slot: p.slot, address: p.address }));
}

export async function getPickup(id: string): Promise<PickupDetail | null> {
  if (!pickupIdSchema.safeParse(id).success) return null;
  const me = await getCurrentUser();
  if (!me) return null;
  const db = await createClient();
  const { data: p, error } = await db.from("pickup_requests")
    .select("id, waste_type, status, preferred_date, slot, address, note, decline_reason, refuse_reason, segregation_ok, photo_url, requester_id, assigned_worker_id")
    .eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load pickup");
  if (!p) return null;
  const [events, linked, org, workers] = await Promise.all([
    db.from("pickup_events").select("id, type, created_at, note, old_date, old_slot").eq("pickup_id", id).order("created_at"),
    db.from("reports").select("id").eq("source_pickup_id", id).maybeSingle(),
    db.from("organizations").select("segregation_policy").eq("id", me.orgId).single(),
    me.role === "admin" ? db.from("users").select("id, name").eq("role", "worker").eq("active", true).order("name") : Promise.resolve({ data: [], error: null }),
  ]);
  if (events.error || linked.error || org.error || workers.error) throw new Error("Could not load pickup details");
  const [photoUrl] = await signPhotos([p.photo_url], 10);
  return {
    id: p.id, wasteType: p.waste_type, status: p.status as PickupStatus,
    preferredDate: p.preferred_date, slot: p.slot, address: p.address, note: p.note,
    declineReason: p.decline_reason, refuseReason: p.refuse_reason, segregationOk: p.segregation_ok, photoUrl,
    requesterId: p.requester_id, assignedWorkerId: p.assigned_worker_id,
    viewerId: me.id, viewerRole: me.role, policy: org.data.segregation_policy,
    linkedReportId: linked.data?.id ?? null, workers: workers.data ?? [],
    events: (events.data ?? []).map((e) => ({ id: e.id, type: e.type, at: e.created_at,
      note: e.note, oldDate: e.old_date, oldSlot: e.old_slot })),
  };
}

export interface NextCollection {
  date: string;
  start: string;
  end: string;
  wasteType: string;
}

// Next routine collection for the resident's home area (03 F12.3), from the active schedules.
export async function getNextCollection(): Promise<NextCollection | null> {
  const db = await createClient();
  const { data } = await db.rpc("get_next_collection");
  const next = data?.[0];
  return next ? { date: next.collection_date, start: next.start_time.slice(0, 5), end: next.end_time.slice(0, 5), wasteType: next.waste_type } : null;
}
