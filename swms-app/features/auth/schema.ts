// Input rules for login and sign-up (03 F1.1–F1.2); the same schemas are re-checked on the server.

import { z } from "zod";

export const INACTIVE_MESSAGE = "Your account is not active. Please contact your organisation's admin.";

export const PASSWORD_MIN = 8; // 04-AUTH §security: "recommend 8"

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Use 80 characters or fewer."),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^$|^\+?[0-9][0-9 -]{7,14}$/, "Enter a valid phone number, or leave it empty."),
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
    .max(72, "Use 72 characters or fewer."),
  organizationId: z.uuid("Choose your organisation."),
  areaId: z.uuid("Choose your home area."),
});

export type LoginInput = z.input<typeof loginSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpField = keyof SignUpInput;

export type AuthResult<Field extends string = string> =
  | { ok: true; home: string }
  | { ok: false; message?: string; fieldErrors?: Partial<Record<Field, string>> };

export interface SignUpOptions {
  organizations: { id: string; name: string }[];
  areas: { id: string; name: string; organizationId: string }[];
}
