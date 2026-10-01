"use server";

// Login, sign-up and logout (03 F1.1, F1.2, F1.5; 04-AUTH §4). Supabase Auth holds passwords;
// the sign-up trigger (06 §6, 0800) checks the area belongs to the organisation and creates a resident,
// or — with a staff ID — the worker or admin that the organisation's staff list names.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, isRole } from "@/lib/roles";
import { firstErrors } from "@/lib/validation/field-errors";
import { INACTIVE_MESSAGE, PASSWORD_MIN, STAFF_NOT_VERIFIED, WORKER_LOGIN_MISMATCH, loginSchema, signUpSchema, workerLoginSchema,
  type AuthResult, type LoginInput, type SignUpField, type SignUpInput, type WorkerLoginInput } from "./schema";

const WRONG_LOGIN = "Email or password is incorrect.";
const TOO_MANY = "Too many attempts. Please wait a minute and try again.";
const UNEXPECTED = "Something went wrong. Please try again.";

export async function login(input: LoginInput): Promise<AuthResult<keyof LoginInput>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.status === 429) return { ok: false, message: TOO_MANY };
    return { ok: false, message: error?.code === "invalid_credentials" || error?.status === 400 ? WRONG_LOGIN : UNEXPECTED };
  }

  const { data: me } = await supabase.from("users").select("role, active").eq("id", data.user.id).maybeSingle();
  if (!me?.active || !isRole(me.role)) {
    await supabase.auth.signOut();
    return { ok: false, message: INACTIVE_MESSAGE };
  }
  return { ok: true, home: ROLE_HOME[me.role] };
}

// Worker login: the password proves who it is; organisation and staff ID must match the profile; the
// chosen block / area is saved as today's check-in (1100) so the admin sees where everyone works.
export async function workerLogin(input: WorkerLoginInput): Promise<AuthResult<keyof WorkerLoginInput>> {
  const parsed = workerLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error) };
  const { email, password, organizationId, areaId, staffId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.status === 429) return { ok: false, message: TOO_MANY };
    return { ok: false, message: error?.code === "invalid_credentials" || error?.status === 400 ? WRONG_LOGIN : UNEXPECTED };
  }
  const { data: me } = await supabase.from("users").select("role, active, org_id, staff_id").eq("id", data.user.id).maybeSingle();
  if (!me?.active) {
    await supabase.auth.signOut();
    return { ok: false, message: INACTIVE_MESSAGE };
  }
  if (me.role !== "worker" || me.org_id !== organizationId || (me.staff_id ?? "").toUpperCase() !== staffId.toUpperCase()) {
    await supabase.auth.signOut();
    return { ok: false, message: WORKER_LOGIN_MISMATCH };
  }
  const { error: checkInError } = await supabase.rpc("check_in", { p_area: areaId });
  if (checkInError) {
    await supabase.auth.signOut();
    return { ok: false, fieldErrors: { areaId: "Choose a block or area of your organisation." } };
  }
  return { ok: true, home: ROLE_HOME.worker };
}

export async function signUp(input: SignUpInput): Promise<AuthResult<SignUpField>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error) };
  const { name, email, phone, password, organizationId, areaId, accountType, staffId, workerType } = parsed.data;
  const staff = accountType !== "resident";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        org_id: organizationId,
        area_id: accountType === "admin" ? "" : areaId,
        name,
        phone: phone || null,
        // Only a claim: the database gives the role from the staff list, or refuses the sign-up.
        ...(staff && { staff_id: staffId, staff_role: accountType, worker_type: accountType === "worker" ? workerType : null }),
      },
    },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { ok: false, fieldErrors: { email: "An account with this email already exists. Log in instead." } };
    }
    if (error.code === "weak_password") return { ok: false, fieldErrors: { password: error.message } };
    if (error.status === 429) return { ok: false, message: TOO_MANY };
    // The trigger rejects an unknown organisation, an area from another organisation or an unverified staff ID.
    // Supabase reports a refusal from the trigger as "Database error saving new user" (status 500, no code).
    if (error.code === "unexpected_failure" || error.message === "Database error saving new user") {
      if (staff) return { ok: false, fieldErrors: { staffId: STAFF_NOT_VERIFIED } };
      return { ok: false, fieldErrors: { areaId: "Choose a home area from your organisation." } };
    }
    return { ok: false, message: UNEXPECTED };
  }
  // Email confirmation is off for the demo (04 D3); if it is turned on, there is no session yet.
  if (!data.session) return { ok: false, message: "Account created. Check your email to confirm it, then log in." };
  const { data: me } = await supabase.from("users").select("role").eq("id", data.session.user.id).maybeSingle();
  return { ok: true, home: isRole(me?.role) ? ROLE_HOME[me.role] : ROLE_HOME.resident };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(email: string): Promise<{ ok: boolean; message: string }> {
  if (!loginSchema.shape.email.safeParse(email).success) return { ok: false, message: "Enter a valid email address." };
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin");
  if (!origin) return { ok: false, message: "Password reset is not configured yet." };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin.replace(/\/$/, "")}/auth/callback?next=/update-password`,
  });
  if (error?.status === 429) return { ok: false, message: TOO_MANY };
  if (error) return { ok: false, message: UNEXPECTED };
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function updatePassword(password: string): Promise<{ ok: boolean; message: string }> {
  if (password.length < PASSWORD_MIN || password.length > 72)
    return { ok: false, message: "Use a password of at least 8 characters." };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, message: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: UNEXPECTED };
  return { ok: true, message: "Password updated. You can continue to your account." };
}
