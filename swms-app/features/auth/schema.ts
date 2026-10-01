// Input rules for login and sign-up (03 F1.1–F1.2); the same schemas are re-checked on the server.

import { z } from "zod";

export const INACTIVE_MESSAGE = "Your account is not active. Please contact your organisation's admin.";

export const PASSWORD_MIN = 8; // 04-AUTH §security: "recommend 8"

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export const ACCOUNT_TYPES = ["resident", "worker", "admin"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const STAFF_NOT_VERIFIED =
  "We couldn't verify this staff ID with this work email and role. Ask your organisation's admin to check the staff list.";

const signUpFields = z.object({
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
  // Home area for residents, work area for workers; not asked for admins.
  areaId: z.union([z.uuid(), z.literal("")]),
  accountType: z.enum(ACCOUNT_TYPES, "Choose who you are."),
  // Staff ID and worker type are checked against the organisation's staff list by the database (0800).
  staffId: z.string().trim().max(40),
  workerType: z.union([z.enum(["collector", "driver"]), z.literal("")]),
});

export const signUpSchema = signUpFields.superRefine((v, ctx) => {
  if (v.accountType === "resident" && !v.areaId) ctx.addIssue({ code: "custom", path: ["areaId"], message: "Choose your home area." });
  if (v.accountType === "worker" && !v.areaId) ctx.addIssue({ code: "custom", path: ["areaId"], message: "Choose the area you work in." });
  if (v.accountType !== "resident" && !/^[A-Za-z0-9-]{3,40}$/.test(v.staffId))
    ctx.addIssue({ code: "custom", path: ["staffId"], message: "Enter your staff ID as printed on your staff card." });
  if (v.accountType === "worker" && !v.workerType)
    ctx.addIssue({ code: "custom", path: ["workerType"], message: "Choose the type of work you do." });
});

// Worker login (user decision 2026-10-01): staff ID and the block / area worked in now, on top of email + password.
export const workerLoginSchema = loginSchema.extend({
  organizationId: z.uuid("Choose your organisation."),
  areaId: z.uuid("Choose the block or area you are working in now."),
  staffId: z.string().trim().regex(/^[A-Za-z0-9-]{3,40}$/, "Enter your staff ID as printed on your staff card."),
});

export const WORKER_LOGIN_MISMATCH = "These details don't match a worker account of this organisation.";

export type LoginInput = z.input<typeof loginSchema>;
export type WorkerLoginInput = z.input<typeof workerLoginSchema>;
export type SignUpInput = z.input<typeof signUpFields>;
export type SignUpField = keyof SignUpInput;

export type AuthResult<Field extends string = string> =
  | { ok: true; home: string }
  | { ok: false; message?: string; fieldErrors?: Partial<Record<Field, string>> };

export interface SignUpOptions {
  organizations: { id: string; name: string }[];
  areas: { id: string; name: string; organizationId: string }[];
}
