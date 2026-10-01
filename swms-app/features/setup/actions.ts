"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SetupResult = { ok: boolean; message: string };
const denied: SetupResult = { ok: false, message: "Only an active admin can change setup." };
const failed: SetupResult = { ok: false, message: "Could not save this change. Check the details and try again." };

async function context() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return null;
  return { me, db: await createClient() };
}
function done(message: string): SetupResult {
  revalidatePath("/admin/setup");
  return { ok: true, message };
}

const smallNumber = z.coerce.number().int().min(1).max(720);
const settingsSchema = z.object({
  timezone: z.string().min(1).max(80),
  escalation_after_hours: smallNumber,
  escalation_level2_after_hours: smallNumber,
  reopen_window_days: smallNumber,
  no_reply_hours: smallNumber,
  recurrence_threshold: smallNumber,
  recurrence_window_days: smallNumber,
  daily_report_limit: smallNumber,
  max_open_pickups: smallNumber,
  far_from_site_m: smallNumber,
  segregation_policy: z.enum(["collect_educate", "warn_escalate", "refuse_allowed"]),
  segregation_warn_threshold: smallNumber,
  segregation_warn_window_days: smallNumber,
  morning_slot_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  afternoon_slot_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  overflowing_bin: smallNumber, garbage_on_road: smallNumber, missed_collection: smallNumber,
  illegal_dumping: smallNumber, improper_segregation: smallNumber, other: smallNumber,
});

export async function saveSettings(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Check the time zone, deadlines and numeric limits." };
  const v = parsed.data;
  try { new Intl.DateTimeFormat("en", { timeZone: v.timezone }); }
  catch { return { ok: false, message: "Enter a valid IANA time zone, such as Asia/Kolkata." }; }
  if (v.afternoon_slot_end <= v.morning_slot_end || v.escalation_level2_after_hours <= v.escalation_after_hours)
    return { ok: false, message: "Afternoon must end after morning; level 2 escalation must be later than level 1." };
  const { error } = await ctx.db.from("organizations").update({
    timezone: v.timezone, escalation_after_hours: v.escalation_after_hours,
    escalation_level2_after_hours: v.escalation_level2_after_hours, reopen_window_days: v.reopen_window_days,
    no_reply_hours: v.no_reply_hours, recurrence_threshold: v.recurrence_threshold,
    recurrence_window_days: v.recurrence_window_days, daily_report_limit: v.daily_report_limit,
    max_open_pickups: v.max_open_pickups, far_from_site_m: v.far_from_site_m,
    segregation_policy: v.segregation_policy, segregation_warn_threshold: v.segregation_warn_threshold,
    segregation_warn_window_days: v.segregation_warn_window_days,
    morning_slot_end: v.morning_slot_end, afternoon_slot_end: v.afternoon_slot_end,
    deadline_hours_json: { overflowing_bin: v.overflowing_bin, garbage_on_road: v.garbage_on_road,
      missed_collection: v.missed_collection, illegal_dumping: v.illegal_dumping,
      improper_segregation: v.improper_segregation, other: v.other },
  }).eq("id", ctx.me.orgId);
  return error ? failed : done("Settings saved.");
}

export async function addArea(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const name = z.string().trim().min(2).max(80).safeParse(form.get("name"));
  if (!name.success) return { ok: false, message: "Enter an area name of 2–80 characters." };
  const { error } = await ctx.db.from("areas").insert({ org_id: ctx.me.orgId, name: name.data });
  return error ? failed : done("Area added.");
}

export async function updateArea(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id"));
  const name = z.string().trim().min(2).max(80).safeParse(form.get("name"));
  const active = form.get("active") === "true";
  if (!id.success || !name.success) return failed;
  const { error } = await ctx.db.from("areas").update({ name: name.data, active })
    .eq("id", id.data).eq("org_id", ctx.me.orgId);
  return error ? failed : done("Area updated.");
}

const placeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  kind: z.enum(["bin", "spot", "disposal_site"]),
  areaId: z.uuid().nullable(),
  address: z.string().trim().max(300),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});
function placeFields(form: FormData) {
  const lat = String(form.get("lat") ?? "").trim();
  const lng = String(form.get("lng") ?? "").trim();
  return placeSchema.safeParse({
    name: form.get("name"), kind: form.get("kind"),
    areaId: form.get("areaId") || null, address: form.get("address") || "",
    lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null,
  });
}
function validPlace(v: z.infer<typeof placeSchema>) {
  return (v.kind === "disposal_site" || v.areaId !== null) &&
    ((v.lat === null && v.lng === null) || (v.lat !== null && v.lng !== null)) &&
    (v.address.length > 0 || v.lat !== null);
}

export async function addLocation(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const parsed = placeFields(form);
  if (!parsed.success || !validPlace(parsed.data))
    return { ok: false, message: "Enter a name, area, and address or coordinate pair." };
  const p = parsed.data;
  if (p.areaId) {
    const { data } = await ctx.db.from("areas").select("id").eq("id", p.areaId).eq("active", true).maybeSingle();
    if (!data) return { ok: false, message: "Choose an active area." };
  }
  const { error } = await ctx.db.from("locations").insert({ org_id: ctx.me.orgId,
    name: p.name, kind: p.kind, area_id: p.areaId, address: p.address || null,
    lat: p.lat, lng: p.lng, qr_code: crypto.randomUUID().replaceAll("-", "") });
  return error ? failed : done("Place added.");
}

export async function updateLocation(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id"));
  const parsed = placeFields(form);
  if (!id.success || !parsed.success || !validPlace(parsed.data)) return failed;
  const p = parsed.data;
  if (p.areaId) {
    const { data } = await ctx.db.from("areas").select("id").eq("id", p.areaId).eq("active", true).maybeSingle();
    if (!data) return { ok: false, message: "Choose an active area." };
  }
  const { error } = await ctx.db.from("locations").update({ name: p.name, kind: p.kind,
    area_id: p.areaId, address: p.address || null, lat: p.lat, lng: p.lng,
    active: form.get("active") === "true" })
    .eq("id", id.data).eq("org_id", ctx.me.orgId);
  return error ? failed : done("Place updated.");
}

export async function regenerateQr(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id")); if (!id.success) return failed;
  const { error } = await ctx.db.from("locations").update({ qr_code: crypto.randomUUID().replaceAll("-", "") })
    .eq("id", id.data).eq("org_id", ctx.me.orgId);
  return error ? failed : done("Code regenerated. Reprint the label for this place.");
}

const vehicleSchema = z.object({
  number: z.string().trim().min(2).max(40),
  kind: z.enum(["truck", "e-rickshaw", "cart", "other"]),
  driverId: z.uuid().nullable(),
});
function vehicleFields(form: FormData) {
  return vehicleSchema.safeParse({ number: form.get("number"), kind: form.get("kind"), driverId: form.get("driverId") || null });
}
async function driverAllowed(ctx: NonNullable<Awaited<ReturnType<typeof context>>>, id: string | null) {
  if (!id) return true;
  const { data } = await ctx.db.from("users").select("id").eq("id", id).eq("role", "worker").eq("active", true).maybeSingle();
  return Boolean(data);
}

export async function addVehicle(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const parsed = vehicleFields(form); if (!parsed.success || !(await driverAllowed(ctx, parsed.data.driverId))) return failed;
  const v = parsed.data;
  const { error } = await ctx.db.from("vehicles").insert({ org_id: ctx.me.orgId, number: v.number, kind: v.kind,
    default_driver_id: v.driverId });
  return error ? failed : done("Vehicle added.");
}

export async function updateVehicle(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id")); const parsed = vehicleFields(form);
  if (!id.success || !parsed.success || !(await driverAllowed(ctx, parsed.data.driverId))) return failed;
  const v = parsed.data;
  const { error } = await ctx.db.from("vehicles").update({ number: v.number, kind: v.kind,
    default_driver_id: v.driverId, active: form.get("active") === "true" })
    .eq("id", id.data).eq("org_id", ctx.me.orgId);
  return error ? failed : done("Vehicle updated.");
}

const scheduleSchema = z.object({
  areaId: z.uuid(), days: z.array(z.number().int().min(0).max(6)).min(1),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  wasteType: z.enum(["mixed", "wet", "dry"]), vehicleId: z.uuid().nullable(), driverId: z.uuid().nullable(),
});
export async function addSchedule(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const parsed = scheduleSchema.safeParse({ areaId: form.get("areaId"),
    days: form.getAll("days").map(Number), start: form.get("start"), end: form.get("end"),
    wasteType: form.get("wasteType"), vehicleId: form.get("vehicleId") || null, driverId: form.get("driverId") || null });
  if (!parsed.success || parsed.data.end <= parsed.data.start || !(await driverAllowed(ctx, parsed.data.driverId))) return failed;
  const v = parsed.data;
  const { data: area } = await ctx.db.from("areas").select("id").eq("id", v.areaId).eq("active", true).maybeSingle();
  if (!area) return { ok: false, message: "Choose an active area." };
  if (v.vehicleId) {
    const { data: vehicle } = await ctx.db.from("vehicles").select("id").eq("id", v.vehicleId).eq("active", true).maybeSingle();
    if (!vehicle) return { ok: false, message: "Choose an active vehicle." };
  }
  const { error } = await ctx.db.from("collection_schedules").insert({ org_id: ctx.me.orgId,
    area_id: v.areaId, days_of_week: [...new Set(v.days)].sort(), start_time: v.start,
    end_time: v.end, waste_type: v.wasteType, vehicle_id: v.vehicleId, driver_id: v.driverId });
  return error ? failed : done("Collection schedule added.");
}

export async function setScheduleActive(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id")); if (!id.success) return failed;
  const { error } = await ctx.db.from("collection_schedules").update({ active: form.get("active") === "true" })
    .eq("id", id.data).eq("org_id", ctx.me.orgId);
  return error ? failed : done("Schedule updated.");
}

const staffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().max(254),
  role: z.enum(["worker", "supervisor"]),
  workerType: z.enum(["collector", "driver"]).nullable(),
  areaId: z.uuid().nullable(),
}).refine((v) => v.role !== "worker" || v.workerType !== null);

// Admin invites a worker or supervisor by email (03 F2.3). The sign-up trigger creates the profile as a
// resident in the admin's organisation; the admin client then sets the staff role (02-BACKEND §3, use 4).
export async function addStaff(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const parsed = staffSchema.safeParse({ name: form.get("name"), email: form.get("email"), role: form.get("role"),
    workerType: form.get("role") === "worker" ? form.get("workerType") || null : null, areaId: form.get("areaId") || null });
  if (!parsed.success) return { ok: false, message: "Enter a name, a valid email, a role and, for a worker, the type of work." };
  const v = parsed.data;
  if (v.areaId) {
    const { data: area } = await ctx.db.from("areas").select("id").eq("id", v.areaId).eq("active", true).maybeSingle();
    if (!area) return { ok: false, message: "Choose an active area." };
  }
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin");
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
    data: { org_id: ctx.me.orgId, area_id: v.areaId ?? "", name: v.name },
    redirectTo: origin ? `${origin.replace(/\/$/, "")}/auth/callback?next=/update-password` : undefined,
  });
  if (error || !data.user) {
    console.error("addStaff failed", { userId: ctx.me.id, orgId: ctx.me.orgId, code: error?.code, status: error?.status });
    if (error?.code === "email_exists" || error?.code === "user_already_exists") return { ok: false, message: "An account with this email already exists." };
    if (error?.status === 429) return { ok: false, message: "Too many invites. Please wait a few minutes and try again." };
    return { ok: false, message: "Could not send the invite email. Check the address and try again." };
  }
  const { error: roleError } = await admin.from("users").update({ role: v.role, worker_type: v.workerType }).eq("id", data.user.id).eq("org_id", ctx.me.orgId);
  if (roleError) {
    console.error("addStaff role failed", { userId: ctx.me.id, orgId: ctx.me.orgId, code: roleError.code });
    return { ok: false, message: "The invite was sent, but the role could not be set. Set it again from the list." };
  }
  return done(`Invite sent to ${v.email}.`);
}

// Deactivating a worker returns their open cases to the admin and unassigns scheduled pickups (F2.3).
export async function setStaffActive(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id")); if (!id.success) return failed;
  const activate = form.get("active") === "true";
  const { error } = await ctx.db.rpc(activate ? "reactivate_user" : "deactivate_user", { p_user: id.data });
  if (error) {
    console.error("setStaffActive failed", { userId: ctx.me.id, orgId: ctx.me.orgId, code: error.code });
    return { ok: false, message: error.message === "Not allowed" ? "You can't change this person." : failed.message };
  }
  revalidatePath("/admin");
  return done(activate ? "Person reactivated." : "Person deactivated. Their open work was returned to you.");
}

const staffIdSchema = z.object({
  staffId: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/),
  email: z.email().trim().toLowerCase().max(254),
  role: z.enum(["worker", "admin"]),
  workerType: z.enum(["collector", "driver"]).nullable(),
}).refine((v) => v.role !== "worker" || v.workerType !== null);

// Staff list for verified sign-up (0800): only a listed staff ID + email can open a worker or admin account.
export async function addStaffId(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const parsed = staffIdSchema.safeParse({ staffId: form.get("staffId"), email: form.get("email"), role: form.get("role"),
    workerType: form.get("role") === "worker" ? form.get("workerType") || null : null });
  if (!parsed.success) return { ok: false, message: "Enter a staff ID (letters, numbers, dashes), a valid email, a role and, for a worker, the type of work." };
  const v = parsed.data;
  const { error } = await ctx.db.rpc("add_staff_id", { p_staff_id: v.staffId, p_email: v.email, p_role: v.role, p_worker_type: v.workerType ?? undefined });
  if (error) {
    if (error.message === "Staff ID or email already listed") return { ok: false, message: "This staff ID or email is already on the list." };
    console.error("addStaffId failed", { userId: ctx.me.id, orgId: ctx.me.orgId, code: error.code });
    return failed;
  }
  return done(`${v.staffId.toUpperCase()} added. That person can now sign up as ${v.role === "admin" ? "an administrator" : `a ${v.workerType === "driver" ? "driver" : "waste collector"}`}.`);
}

export async function removeStaffId(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const id = z.uuid().safeParse(form.get("id")); if (!id.success) return failed;
  const { error } = await ctx.db.rpc("remove_staff_id", { p_id: id.data });
  return error ? { ok: false, message: "Only unused staff IDs can be removed." } : done("Staff ID removed.");
}

// Admin moves a worker to another assigned work area (1100); duties are usually planned in this area.
export async function setWorkerArea(form: FormData): Promise<SetupResult> {
  const ctx = await context(); if (!ctx) return denied;
  const worker = z.uuid().safeParse(form.get("id")); const area = z.uuid().safeParse(form.get("areaId"));
  if (!worker.success || !area.success) return { ok: false, message: "Choose an area." };
  const { error } = await ctx.db.rpc("set_worker_area", { p_worker: worker.data, p_area: area.data });
  return error ? failed : done("Work area updated.");
}
