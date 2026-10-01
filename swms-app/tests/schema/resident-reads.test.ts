// Leaderboard and next-collection functions (06 §8.3, migration 20261001000700) on the real migrations and seed.sql.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb } from "./db";

const ORG_A = "eb1cf32b-47a8-5ec9-aee6-c241bb18eef8";
const ORG_B = "e3ae7902-1b73-525e-ac82-7a96dfa1e19d";

let db: PGlite;
const people: Record<string, string> = {};

async function signUp(key: string, org: string, area: string, name = key) {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id, `${key}@example.test`, JSON.stringify({ org_id: org, area_id: area, name }),
  ]);
  people[key] = id;
  return id;
}

async function points(user: string, total: number) {
  const report = randomUUID();
  await db.query(
    `insert into public.reports (id, org_id, reporter_id, issue_type, photo_url, status, due_at, waste_category)
     select $1, org_id, id, 'other', 'x', 'closed', now(), 'dry' from public.users where id = $2`, [report, user]);
  await db.query(`insert into public.reward_events (org_id, user_id, report_id, points, reason)
     select org_id, id, $1, $3, 'verified_report' from public.users where id = $2`, [report, user, total]);
}

beforeAll(async () => {
  db = await createDb();
  await db.exec(readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8"));
  const rows = (await db.query<{ id: string; org_id: string; name: string }>(`select id, org_id, name from public.areas order by org_id, name`)).rows;
  const first = (org: string) => rows.filter((r) => r.org_id === org);
  const a1 = first(ORG_A)[0].id;
  const a2 = first(ORG_A)[1].id;
  await signUp("asha", ORG_A, a1, "Asha Verma");
  await signUp("bala", ORG_A, a1, "Bala Singh");
  await signUp("chitra", ORG_A, a1, "Chitra Rao");
  await signUp("dev", ORG_A, a2, "Dev Patel");
  await signUp("farid", ORG_B, first(ORG_B)[0].id, "Farid Khan");
  people.areaA1 = a1;
  people.areaA2 = a2;
  await points(people.asha, 30);
  await points(people.bala, 10);
  await points(people.chitra, 50);
  await points(people.dev, 99);
  await db.query(`update public.users set show_on_leaderboard = true where id in ($1, $2, $3, $4)`, [people.asha, people.bala, people.dev, people.farid]);
}, 60_000);

describe("get_leaderboard", () => {
  it("lists only opted-in residents of the viewer's own area, first names only, highest points first", async () => {
    const rows = (await as(db, people.chitra, () => db.query<{ first_name: string; area_name: string; points: string }>(`select * from public.get_leaderboard()`))).rows;
    expect(rows.map((r) => [r.first_name, Number(r.points)])).toEqual([["Asha", 30], ["Bala", 10]]);
    expect(JSON.stringify(rows)).not.toMatch(/Verma|Singh|Chitra/);
  });

  it("never mixes organisations or areas", async () => {
    const other = (await as(db, people.farid, () => db.query<{ first_name: string }>(`select * from public.get_leaderboard()`))).rows;
    expect(other.map((r) => r.first_name)).toEqual(["Farid"]);
    const asked = (await as(db, people.chitra, () => db.query<{ first_name: string }>(`select * from public.get_leaderboard($1)`, [people.areaA2]))).rows;
    expect(asked.map((r) => r.first_name)).toEqual(["Dev"]);
    // Asking for another organisation's area returns nothing: the organisation check comes first.
    const otherOrgArea = (await db.query<{ id: string }>(`select id from public.areas where org_id = $1 limit 1`, [ORG_B])).rows[0].id;
    const crossOrg = (await as(db, people.chitra, () => db.query(`select * from public.get_leaderboard($1)`, [otherOrgArea]))).rows;
    expect(crossOrg).toHaveLength(0);
  });

  it("is hidden from logged-out visitors, and a person who has not opted in is not listed", async () => {
    await expect(as(db, null, () => db.query(`select * from public.get_leaderboard()`))).rejects.toThrow(/permission denied/);
    const rows = (await as(db, people.asha, () => db.query<{ first_name: string }>(`select * from public.get_leaderboard()`))).rows;
    expect(rows.map((r) => r.first_name)).not.toContain("Chitra");
  });
});

describe("get_next_collection", () => {
  it("returns the next active schedule of the viewer's area, and nothing when there is none", async () => {
    expect((await as(db, people.asha, () => db.query(`select * from public.get_next_collection()`))).rows).toHaveLength(0);
    await db.query(`insert into public.collection_schedules (org_id, area_id, days_of_week, start_time, end_time, waste_type)
                    values ($1, $2, '{0,1,2,3,4,5,6}', '00:00', '23:59', 'wet')`, [ORG_A, people.areaA1]);
    const next = (await as(db, people.asha, () => db.query<{ waste_type: string }>(`select * from public.get_next_collection()`))).rows;
    expect(next).toHaveLength(1);
    expect(next[0].waste_type).toBe("wet");
    expect((await as(db, people.dev, () => db.query(`select * from public.get_next_collection()`))).rows).toHaveLength(0);
    expect((await as(db, people.farid, () => db.query(`select * from public.get_next_collection()`))).rows).toHaveLength(0);
  });

  it("skips inactive schedules", async () => {
    await db.query(`update public.collection_schedules set active = false where area_id = $1`, [people.areaA1]);
    expect((await as(db, people.asha, () => db.query(`select * from public.get_next_collection()`))).rows).toHaveLength(0);
  });
});
