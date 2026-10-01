// Service-role client: bypasses RLS. The only file that reads SUPABASE_SERVICE_ROLE_KEY.
// Allowed uses only (02-BACKEND §3): photo upload/delete, signed links after the user client
// has proved access, ai_runs inserts, and creating staff accounts.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./server";

export function createAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
