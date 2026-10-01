// Read-only checks on the hosted database (06 §11): logged-out users read nothing,
// sign-up lists work, and one organisation cannot see the other. Run: npm run check:db

import { createClient } from "@supabase/supabase-js";

const TABLES = ["organizations", "areas", "users", "locations", "reports", "report_events", "pickup_requests", "notifications", "ai_runs"];
const ORG_B = "e3ae7902-1b73-525e-ac82-7a96dfa1e19d";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

const client = () =>
  createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

let failed = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}

async function main() {
  const anon = client();
  for (const table of TABLES) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    check(`logged-out cannot read ${table}`, Boolean(error) || data?.length === 0);
  }
  const { data: orgs } = await anon.rpc("list_orgs_for_signup");
  check("sign-up list shows 2 organisations", orgs?.length === 2);

  const resident = client();
  const { error: loginError } = await resident.auth.signInWithPassword({
    email: "resident1@citywarda.demo",
    password: env("SEED_USER_PASSWORD"),
  });
  check("sample resident can log in", !loginError);
  if (!loginError) {
    const { data: me } = await resident.from("users").select("role").single();
    check("resident profile has role resident", me?.role === "resident");
    const { data: other } = await resident.from("areas").select("id").eq("org_id", ORG_B);
    check("resident of City Ward A sees 0 rows of Green Residency", other?.length === 0);
    const { error: writeError } = await resident.from("reports").update({ status: "closed" }).neq("id", "00000000-0000-0000-0000-000000000000");
    check("resident cannot change reports directly", Boolean(writeError));
  }
  process.exit(failed ? 1 : 0);
}

main();
