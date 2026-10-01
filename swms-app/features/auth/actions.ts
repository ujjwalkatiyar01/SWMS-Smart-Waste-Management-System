"use server";

// Login, sign-up and logout (03 F1.1, F1.2, F1.5; 04-AUTH §4). Supabase Auth holds passwords;
// the sign-up trigger (06 §6) always creates a resident and checks the area belongs to the organisation.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, isRole } from "@/lib/roles";
import { firstErrors } from "@/lib/validation/field-errors";
import { INACTIVE_MESSAGE, loginSchema, signUpSchema, type AuthResult, type LoginInput, type SignUpField, type SignUpInput } from "./schema";

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

export async function signUp(input: SignUpInput): Promise<AuthResult<SignUpField>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: firstErrors(parsed.error) };
  const { name, email, phone, password, organizationId, areaId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { org_id: organizationId, area_id: areaId, name, phone: phone || null } },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { ok: false, fieldErrors: { email: "An account with this email already exists. Log in instead." } };
    }
    if (error.code === "weak_password") return { ok: false, fieldErrors: { password: error.message } };
    if (error.status === 429) return { ok: false, message: TOO_MANY };
    // The trigger rejects an unknown organisation or an area from another organisation.
    if (error.code === "unexpected_failure") {
      return { ok: false, fieldErrors: { areaId: "Choose a home area from your organisation." } };
    }
    return { ok: false, message: UNEXPECTED };
  }
  // Email confirmation is off for the demo (04 D3); if it is turned on, there is no session yet.
  if (!data.session) return { ok: false, message: "Account created. Check your email to confirm it, then log in." };
  return { ok: true, home: ROLE_HOME.resident };
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
  if (!signUpSchema.shape.password.safeParse(password).success)
    return { ok: false, message: "Use a password of at least 8 characters." };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, message: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: UNEXPECTED };
  return { ok: true, message: "Password updated. You can continue to your account." };
}
