// Server-only reads for the auth screens (pages import this; client components never do).

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SignUpOptions } from "./schema";

/** Organisations and their active areas for the sign-up form (06 §6; allowed without login). */
export async function getSignUpOptions(): Promise<SignUpOptions> {
  const supabase = await createClient();
  const { data: orgs, error } = await supabase.rpc("list_orgs_for_signup");
  if (error) throw new Error("Could not load organisations");

  const organizations = (orgs as { id: string; name: string }[]).map((o) => ({ id: o.id, name: o.name }));
  const areaLists = await Promise.all(
    organizations.map(async (org) => {
      const { data, error: areaError } = await supabase.rpc("list_areas_for_signup", { p_org: org.id });
      if (areaError) throw new Error("Could not load areas");
      return (data as { id: string; name: string }[]).map((a) => ({ id: a.id, name: a.name, organizationId: org.id }));
    }),
  );
  return { organizations, areas: areaLists.flat() };
}
