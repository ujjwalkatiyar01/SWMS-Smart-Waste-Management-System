"use server";

// Duty and check-in actions (1100). The database functions check role, organisation, ownership,
// the day of the duty and the allowed status change; these actions validate input and map errors.

import { revalidatePath } from "next/cache";
import type { Db } from "@/features/staff/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deletePhoto } from "@/lib/photos/storage";
import { createClient } from "@/lib/supabase/server";
import type { ActionOutcome } from "@/lib/validation/result";
import {
  completeDutySchema,
  createDutiesSchema,
  startDutySchema,
  type CompleteDutyInput,
  type CreateDutiesInput,
  type StartDutyInput,
} from "./schema";

const LOGIN_AGAIN = "Your session has ended. Please log in again.";

const MESSAGES: Record<string, string> = {
  "Choose an active worker": "Choose an active worker of your organisation.",
  "Choose a work area of your organisation": "Choose a work area of your organisation.",
  "Choose a place in this area": "The place must be in the chosen work area.",
  "End time must be after start time": "The shift must end after it starts.",
  "Choose dates from today up to 60 days ahead": "Choose days from today up to 60 days ahead.",
  "Only a duty that has not started can be cancelled": "Only a duty that has not started can be cancelled.",
  "This duty cannot be started now": "This duty can be started only on its own day, once.",
  "Start this duty first": "Start this duty first.",
  "Add an after-photo": "Add an after-photo.",
  "Not allowed": "You can't do this.",
};
const message = (db: string | undefined) => (db && MESSAGES[db]) || "Could not save. Please try again.";

async function db() {
  return (await createClient()) as unknown as Db;
}

export async function createDuties(input: CreateDutiesInput): Promise<ActionOutcome & { created?: number }> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = createDutiesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  const { data, error } = await (await db()).rpc("create_duties", {
    // The SQL argument accepts null ("no particular place"); generated types list it as a plain string.
    p_worker: v.workerId, p_area: v.areaId, p_location: v.locationId as string, p_task: v.task,
    p_dates: [...new Set(v.dates)], p_start: v.start, p_end: v.end,
  });
  if (error) {
    console.error("createDuties failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: message(error.message) };
  }
  revalidatePath("/admin/duties");
  return { ok: true, created: data };
}

export async function cancelDuty(dutyId: string): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  if (!startDutySchema.shape.dutyId.safeParse(dutyId).success) return { ok: false, message: "This duty could not be found." };
  const { error } = await (await db()).rpc("cancel_duty", { p_duty: dutyId });
  if (error) return { ok: false, message: message(error.message) };
  revalidatePath("/admin/duties");
  return { ok: true };
}

export async function startDuty(input: StartDutyInput): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = startDutySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "This duty could not be found." };
  const { dutyId, position } = parsed.data;
  const { error } = await (await db()).rpc("start_duty", { p_duty: dutyId, p_lat: position?.lat, p_lng: position?.lng });
  if (error) return { ok: false, message: message(error.message) };
  revalidatePath("/worker");
  return { ok: true };
}

export async function completeDuty(input: CompleteDutyInput): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  const parsed = completeDutySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { dutyId, photoPath, note, position } = parsed.data;
  const { error } = await (await db()).rpc("complete_duty", {
    p_duty: dutyId, p_photo: photoPath, p_note: note || undefined, p_lat: position?.lat, p_lng: position?.lng,
  });
  if (error) {
    console.error("completeDuty failed", { userId: me.id, orgId: me.orgId, code: error.code });
    // Nothing half-saved (03 F3.6): remove the photo only if it sits in this duty's folder.
    if (photoPath.startsWith(`${me.orgId}/duties/${dutyId}/`)) await deletePhoto(photoPath);
    return { ok: false, message: message(error.message) };
  }
  revalidatePath("/worker");
  revalidatePath("/admin/duties");
  return { ok: true };
}

/** The worker says which block / area they are working in now (also asked at worker login). */
export async function checkIn(areaId: string): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, message: LOGIN_AGAIN };
  if (!startDutySchema.shape.dutyId.safeParse(areaId).success) return { ok: false, message: "Choose your work area." };
  const { error } = await (await db()).rpc("check_in", { p_area: areaId });
  if (error) return { ok: false, message: message(error.message) };
  revalidatePath("/worker");
  return { ok: true };
}
