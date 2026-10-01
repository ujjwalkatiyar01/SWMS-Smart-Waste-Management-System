// Creates the sample logins (02-PRD F1): per organisation 1 admin, 1 supervisor,
// 1 higher authority, 2 workers, 3 residents. Safe to run again.
// Run: npm run seed:users   (reads .env.local; password from SEED_USER_PASSWORD)

import { createClient } from "@supabase/supabase-js";

type Role = "resident" | "worker" | "admin" | "supervisor" | "higher_authority";

// Fixed ids from supabase/seed.sql. Names are fictional sample data.
const ORGS = [
  { id: "eb1cf32b-47a8-5ec9-aee6-c241bb18eef8", domain: "citywarda.demo", areas: ["Market Area", "Station Road", "Park Area"] },
  { id: "e3ae7902-1b73-525e-ac82-7a96dfa1e19d", domain: "greenresidency.demo", areas: ["Block A", "Block B", "Clubhouse Lane"] },
];

const PEOPLE: { key: string; name: string; role: Role; area: number | null }[] = [
  { key: "admin", name: "Anil Verma", role: "admin", area: null },
  { key: "supervisor", name: "Meena Joshi", role: "supervisor", area: null },
  { key: "authority", name: "Rajesh Singh", role: "higher_authority", area: null },
  { key: "worker1", name: "Ravi Kumar", role: "worker", area: 0 },
  { key: "worker2", name: "Sunita Devi", role: "worker", area: 1 },
  { key: "resident1", name: "Priya Sharma", role: "resident", area: 0 },
  { key: "resident2", name: "Aman Gupta", role: "resident", area: 1 },
  { key: "resident3", name: "Farah Khan", role: "resident", area: 2 },
];

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

async function main() {
  const password = env("SEED_USER_PASSWORD");
  if (password.length < 8) throw new Error("SEED_USER_PASSWORD must be at least 8 characters");
  const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    data.users.forEach((u) => u.email && existing.add(u.email));
    if (data.users.length < 1000) break;
  }

  for (const org of ORGS) {
    const { data: areas, error } = await db.from("areas").select("id, name").eq("org_id", org.id);
    if (error) throw error;
    if (!areas?.length) throw new Error(`No areas for org ${org.id}. Load supabase/seed.sql first.`);
    const areaId = (i: number | null) => (i === null ? "" : areas.find((a) => a.name === org.areas[i])?.id ?? "");

    for (const person of PEOPLE) {
      const email = `${person.key}@${org.domain}`;
      if (existing.has(email)) {
        console.log(`exists   ${email}`);
        continue;
      }
      // The sign-up trigger (06 §6) needs org_id and area_id and always makes a resident.
      const { data, error: createError } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { org_id: org.id, area_id: areaId(person.area), name: person.name },
      });
      if (createError) throw createError;
      if (person.role !== "resident") {
        const { error: roleError } = await db.from("users").update({ role: person.role }).eq("id", data.user.id);
        if (roleError) throw roleError;
      }
      console.log(`created  ${email}  (${person.role})`);
    }
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
