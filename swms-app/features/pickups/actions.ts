"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { firstErrors } from "@/lib/validation/field-errors";
import {
  collectSchema, createPickupSchema, editPickupSchema, pickupIdSchema, reasonSchema,
  schedulePickupSchema, type CreatePickupInput, type EditPickupInput, type PickupActionResult,
  type PickupFields,
} from "./schema";

type RpcError = { message: string; code?: string };
const SESSION_ENDED = "Your session has ended. Please log in again.";

function userMessage(error: RpcError) {
  if (error.message === "Open pickup limit reached") return "You have reached the open-pickup limit for your organisation.";
  if (error.message === "Invalid pickup details") return "Check the waste type, date, slot and address.";
  if (error.message === "Worker not available") return "Choose an active worker from this organisation.";
  if (error.message === "Not allowed") return "This pickup has changed or you cannot update it. Refresh the page.";
  if (error.message === "Add a reason") return "Add a reason.";
  if (error.message === "Choose segregation result") return "Choose whether the waste was segregated.";
  return "Something went wrong. Please try again.";
}

async function invoke(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: RpcError | null }> {
  const db = await createClient();
  // Centralise the dynamic transition RPC call; each branch validates and supplies its own argument contract.
  return (db.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }>)(name, args);
}

function refresh(id: string) {
  revalidatePath("/my");
  revalidatePath("/worker");
  revalidatePath("/admin");
  revalidatePath(`/pickup/${id}`);
}

export async function createPickup(input: CreatePickupInput): Promise<PickupActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: SESSION_ENDED };
  const parsed = createPickupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the form fields.", fieldErrors: firstErrors<keyof PickupFields>(parsed.error) };
  const p = parsed.data;
  const { error } = await invoke("create_pickup", {
    p_id: p.id, p_waste_type: p.wasteType, p_preferred_date: p.preferredDate,
    p_slot: p.slot, p_address: p.address, p_note: p.note,
  });
  if (error) {
    console.error("createPickup failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: userMessage(error) };
  }
  refresh(p.id);
  return { ok: true, id: p.id };
}

export async function editPickup(input: EditPickupInput): Promise<PickupActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: SESSION_ENDED };
  const parsed = editPickupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the form fields.", fieldErrors: firstErrors<keyof PickupFields>(parsed.error) };
  const p = parsed.data;
  const { error } = await invoke("edit_pickup", {
    p_pickup: p.id, p_waste_type: p.wasteType, p_preferred_date: p.preferredDate,
    p_slot: p.slot, p_address: p.address, p_note: p.note,
  });
  if (error) return { ok: false, message: userMessage(error) };
  refresh(p.id);
  return { ok: true, id: p.id };
}

export async function pickupTransition(
  input: { kind: "cancel" | "schedule" | "reschedule" | "decline" | "collect" | "refuse"; id: string; date?: string; slot?: string; workerId?: string | null; reason?: string; segregationOk?: boolean; photoPath?: string },
): Promise<PickupActionResult> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: SESSION_ENDED };
  if (!pickupIdSchema.safeParse(input.id).success) return { ok: false, message: "Pickup not found." };
  if (input.photoPath) {
    if (input.photoPath !== `${me.orgId}/pickups/${input.id}/evidence.jpg`)
      return { ok: false, message: "Choose a valid pickup photo." };
    const { error } = await createAdminClient().storage.from("photos").info(input.photoPath);
    if (error) return { ok: false, message: "Upload the pickup photo again." };
  }
  let name: string;
  let args: Record<string, unknown> = { p_pickup: input.id };
  switch (input.kind) {
    case "cancel": name = "cancel_pickup"; break;
    case "schedule":
    case "reschedule": {
      const parsed = schedulePickupSchema.safeParse({ id: input.id, date: input.date, slot: input.slot, workerId: input.workerId ?? null });
      if (!parsed.success) return { ok: false, message: "Choose a valid date, slot and worker." };
      name = input.kind === "schedule" ? "schedule_pickup" : "reschedule_pickup";
      args = { ...args, p_date: parsed.data.date, p_slot: parsed.data.slot };
      if (input.kind === "schedule") args.p_worker = parsed.data.workerId;
      break;
    }
    case "decline": {
      const parsed = reasonSchema.safeParse({ id: input.id, reason: input.reason });
      if (!parsed.success) return { ok: false, message: "Add a reason of 1000 characters or fewer." };
      name = "decline_pickup";
      args.p_reason = parsed.data.reason;
      break;
    }
    case "collect": {
      const parsed = collectSchema.safeParse({ id: input.id, segregationOk: input.segregationOk });
      if (!parsed.success) return { ok: false, message: "Choose whether the waste was segregated." };
      name = "collect_pickup";
      args.p_segregation_ok = parsed.data.segregationOk;
      args.p_photo_url = input.photoPath ?? null;
      break;
    }
    case "refuse": {
      const parsed = reasonSchema.safeParse({ id: input.id, reason: input.reason });
      if (!parsed.success || !input.photoPath) return { ok: false, message: "Add a reason and photo." };
      name = "refuse_pickup";
      args.p_reason = parsed.data.reason;
      args.p_photo_url = input.photoPath;
      break;
    }
  }
  const { error } = await invoke(name, args);
  if (error) return { ok: false, message: userMessage(error) };
  refresh(input.id);
  return { ok: true, id: input.id };
}
