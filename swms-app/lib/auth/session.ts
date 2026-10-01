// The logged-in person's profile for server code, read as that user (RLS: a user may read their own row).

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isRole } from "@/lib/roles";
import type { Role } from "@/types/domain";

export interface CurrentUser {
  id: string;
  orgId: string;
  name: string;
  role: Role;
}

/** Null when logged out or deactivated (04-AUTH §3 checks 1–2). Cached for one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data } = await supabase.from("users").select("id, org_id, name, role, active").eq("id", userId).maybeSingle();
  if (!data || !data.active || !isRole(data.role)) return null;
  return { id: data.id, orgId: data.org_id, name: data.name, role: data.role };
});

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
