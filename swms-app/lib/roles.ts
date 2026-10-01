// Role → home screen, display label, and which roles may open each app area (03 §2, §7; 04-AUTH §2).
// This only routes people to the right screen; the database rules are the real gate.

import type { Role } from "@/types/domain";

export const ROLE_HOME: Record<Role, string> = {
  resident: "/my",
  worker: "/worker",
  admin: "/admin",
  supervisor: "/supervisor",
  higher_authority: "/authority",
};

export const ROLE_LABEL: Record<Role, string> = {
  resident: "Resident",
  worker: "Worker / Driver",
  admin: "Admin",
  supervisor: "Supervisor",
  higher_authority: "Higher authority",
};

const ALL_ROLES = Object.keys(ROLE_HOME) as Role[];

const AREAS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/my", roles: ["resident"] },
  { prefix: "/report", roles: ["resident", "admin"] }, // 03 §7: create report — resident, admin
  { prefix: "/pickup", roles: ["resident", "worker", "admin"] },
  { prefix: "/case", roles: ALL_ROLES }, // who may read a case is decided by the database
  { prefix: "/worker", roles: ["worker"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/supervisor", roles: ["supervisor"] },
  { prefix: "/authority", roles: ["higher_authority"] },
];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value in ROLE_HOME;
}

/** Roles allowed in the app area of this path, or null for a public path. */
export function rolesForPath(pathname: string): Role[] | null {
  const area = AREAS.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  return area ? area.roles : null;
}
