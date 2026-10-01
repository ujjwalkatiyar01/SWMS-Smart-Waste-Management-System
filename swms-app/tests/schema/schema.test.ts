// Schema smoke test (06-PHYSICAL-SCHEMA §11) on the real migration files and seed.sql.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb } from "./db";

const ORG_A = "eb1cf32b-47a8-5ec9-aee6-c241bb18eef8"; // City Ward A (seed.sql)
const ORG_B = "e3ae7902-1b73-525e-ac82-7a96dfa1e19d"; // Green Residency Society

let db: PGlite;
const people: Record<string, string> = {};

async function one<T>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows[0];
}

/** Sign-up path: insert into auth.users; the 06 §6 trigger creates the profile as resident. */
async function signUp(key: string, org: string, area: string | null, role = "resident") {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${key}@example.test`,
    JSON.stringify({ org_id: org, area_id: area ?? "", name: key }),
  ]);
  if (role !== "resident") await db.query(`update public.users set role = $2 where id = $1`, [id, role]);
  people[key] = id;
  return id;
}

async function firstArea(org: string) {
  return (await one<{ id: string }>(`select id from public.areas where org_id = $1 order by name limit 1`, [org])).id;
}

async function firstBin(org: string) {
  return one<{ id: string; lat: number; lng: number }>(
    `select id, lat, lng from public.locations where org_id = $1 and kind = 'bin' order by name limit 1`,
    [org],
  );
}

async function createReport(reporter: string, org: string) {
  const bin = await firstBin(org);
  const id = randomUUID();
  await as(db, reporter, () =>
    db.query(
      `select public.create_report($1, 'overflowing_bin', $2, 'Bin full', $3, $4, $5, 12, 'registered', 'mixed_uncertain')`,
      [id, `${org}/reports/${id}/before.jpg`, bin.id, bin.lat, bin.lng],
    ),
  );
  return id;
}

beforeAll(async () => {
  db = await createDb();
  await db.exec(readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8"));
  const areaA = await firstArea(ORG_A);
  const areaB = await firstArea(ORG_B);
  await signUp("residentA", ORG_A, areaA);
  await signUp("adminA", ORG_A, null, "admin");
  await signUp("workerA", ORG_A, areaA, "worker");
  await signUp("residentB", ORG_B, areaB);
  await signUp("adminB", ORG_B, null, "admin");
}, 60_000);

describe("structure", () => {
  it("has 22 tables, all with RLS enabled", async () => {
    const r = await one<{ total: number; rls: number }>(
      `select count(*)::int total, count(*) filter (where c.relrowsecurity)::int rls
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(r).toEqual({ total: 22, rls: 22 });
  });

  it("seeds 2 organisations, each with 8 bins/spots and 1 disposal site", async () => {
    const rows = (await db.query<{ n: number }>(
      `select count(*) filter (where kind in ('bin','spot'))::int n from public.locations group by org_id`,
    )).rows;
    expect(rows).toEqual([{ n: 8 }, { n: 8 }]);
  });

  it("schedules only the jobs that exist", async () => {
    const jobs = (await db.query<{ jobname: string }>(`select jobname from cron.job order by 1`)).rows.map((r) => r.jobname);
    expect(jobs).toEqual(["escalation", "hotspot-risk", "missed-pickups", "overdue"]);
  });

  it("creates the private photo bucket", async () => {
    expect(await one(`select public, allowed_mime_types from storage.buckets where id = 'photos'`)).toEqual({
      public: false,
      allowed_mime_types: ["image/jpeg"],
    });
  });
});

describe("sign-up", () => {
  it("always creates a resident", async () => {
    expect(await one(`select role from public.users where id = $1`, [people.residentA])).toEqual({ role: "resident" });
  });

  it("rejects a home area from another organisation", async () => {
    await expect(signUp("wrongArea", ORG_A, await firstArea(ORG_B))).rejects.toThrow(/Area does not belong/);
  });
});

describe("access rules", () => {
  it("logged-out visitors read no table but can list organisations for sign-up", async () => {
    await expect(as(db, null, () => db.query(`select * from public.reports`))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, () => db.query(`select * from public.users`))).rejects.toThrow(/permission denied/);
    const orgs = await as(db, null, () => db.query(`select * from public.list_orgs_for_signup()`));
    expect(orgs.rows).toHaveLength(2);
  });

  it("keeps organisations apart", async () => {
    const report = await createReport(people.residentA, ORG_A);
    for (const outsider of [people.residentB, people.adminB]) {
      const seen = await as(db, outsider, () => db.query(`select id from public.reports where id = $1`, [report]));
      expect(seen.rows).toHaveLength(0);
    }
    const locations = await as(db, people.residentB, () =>
      db.query(`select id from public.locations where org_id = $1`, [ORG_A]),
    );
    expect(locations.rows).toHaveLength(0);
  });

  it("refuses direct status changes; functions only", async () => {
    const report = await createReport(people.residentA, ORG_A);
    await expect(
      as(db, people.adminA, () => db.query(`update public.reports set status = 'closed' where id = $1`, [report])),
    ).rejects.toThrow(/permission denied/);
  });

  it("hides QR codes from users", async () => {
    await expect(as(db, people.residentA, () => db.query(`select qr_code from public.locations`))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("prints QR tokens only for admins and resolves only inside the user's organisation", async () => {
    const code = await one<{ qr_code: string }>(`select qr_code from public.locations where org_id = $1 limit 1`, [ORG_A]);
    const residentSheet = await as(db, people.residentA, () => db.query(`select * from public.get_qr_sheet()`));
    expect(residentSheet.rows).toHaveLength(0);
    const adminSheet = await as(db, people.adminA, () => db.query(`select * from public.get_qr_sheet()`));
    expect(adminSheet.rows.length).toBeGreaterThan(0);
    const own = await as(db, people.residentA, () => db.query(`select id from public.resolve_qr($1)`, [code.qr_code]));
    const other = await as(db, people.residentB, () => db.query(`select id from public.resolve_qr($1)`, [code.qr_code]));
    expect(own.rows).toHaveLength(1);
    expect(other.rows).toHaveLength(0);
  });
});

describe("core case", () => {
  it("runs create → assign → complete → feedback → closed, with points once", async () => {
    const report = await createReport(people.residentA, ORG_A);
    const bin = await firstBin(ORG_A);
    await as(db, people.adminA, () => db.query(`select public.assign_report($1, $2)`, [report, people.workerA]));
    await as(db, people.workerA, () =>
      db.query(`select public.complete_report($1, $2, 'Cleaned', $3, $4)`, [
        report,
        `${ORG_A}/reports/${report}/after.jpg`,
        bin.lat,
        bin.lng,
      ]),
    );
    await as(db, people.residentA, () => db.query(`select public.submit_feedback($1, 'resolved', 'Thanks')`, [report]));

    expect(await one(`select status from public.reports where id = $1`, [report])).toEqual({ status: "closed" });
    const points = async () =>
      (await one<{ n: number }>(`select count(*)::int n from public.reward_events where report_id = $1`, [report])).n;
    const first = await points();
    expect(first).toBeGreaterThan(0);
    await db.query(`select private.award_points($1)`, [report]);
    expect(await points()).toBe(first);
  });

  it("stops a wrong role from assigning", async () => {
    const report = await createReport(people.residentA, ORG_A);
    await expect(
      as(db, people.residentA, () => db.query(`select public.assign_report($1, $2)`, [report, people.workerA])),
    ).rejects.toThrow(/Not allowed/);
  });
});

describe("pickup lifecycle", () => {
  it("creates, schedules and collects a pickup with a visible event for each change", async () => {
    const id = randomUUID();
    const date = "2099-01-02";
    const create = () => as(db, people.residentA, () =>
      db.query(`select public.create_pickup($1, 'dry', $2::date, 'morning', 'Block A', 'Paper')`, [id, date]));
    await create();
    await create();
    expect(await one(`select count(*)::int n from public.pickup_requests where id = $1`, [id])).toEqual({ n: 1 });
    await as(db, people.adminA, () =>
      db.query(`select public.schedule_pickup($1, $2::date, 'afternoon', $3)`, [id, date, people.workerA]));
    await as(db, people.workerA, () => db.query(`select public.collect_pickup($1, true)`, [id]));
    expect(await one(`select status from public.pickup_requests where id = $1`, [id])).toEqual({ status: "collected" });
    const types = (await db.query<{ type: string }>(
      `select type from public.pickup_events where pickup_id = $1 order by created_at`, [id],
    )).rows.map((event) => event.type);
    expect(types).toEqual(["created", "scheduled", "collected"]);
  });

  it("rejects another organisation and wrong-role changes", async () => {
    const id = randomUUID();
    await as(db, people.residentA, () =>
      db.query(`select public.create_pickup($1, 'wet', '2099-01-02', 'morning', 'Block A', '')`, [id]));
    await expect(as(db, people.adminB, () =>
      db.query(`select public.schedule_pickup($1, '2099-01-02', 'morning', null)`, [id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, people.residentA, () =>
      db.query(`select public.schedule_pickup($1, '2099-01-02', 'morning', null)`, [id]))).rejects.toThrow(/Not allowed/);
    const seen = await as(db, people.residentB, () =>
      db.query(`select id from public.pickup_requests where id = $1`, [id]));
    expect(seen.rows).toHaveLength(0);
  });
});

describe("AI quota", () => {
  it("lets a resident inspect quota but not forge a reserved AI result", async () => {
    const quota = await as(db, people.residentA, () => db.query<{ user_left: number; org_left: number }>(
      `select * from public.ai_quota_left()`,
    ));
    expect(quota.rows[0].user_left).toBeGreaterThan(0);
    await expect(as(db, people.residentA, () => db.query(
      `select public.reserve_ai_run($1, 'gemini-3.5-flash-lite')`, [people.residentA],
    ))).rejects.toThrow(/permission denied/);
  });
});

describe("jobs", () => {
  it("marks an expired pickup missed and opens exactly one linked complaint", async () => {
    const id = randomUUID();
    await as(db, people.residentA, () =>
      db.query(`select public.create_pickup($1, 'bulky', current_date + 1, 'morning', 'Block A', '')`, [id]));
    await db.query(`update public.pickup_requests set preferred_date = current_date - 1 where id = $1`, [id]);
    await db.query(`select private.job_missed_pickups()`);
    await db.query(`select private.job_missed_pickups()`);
    expect(await one(`select status from public.pickup_requests where id = $1`, [id])).toEqual({ status: "missed" });
    const linked = await one<{ n: number; source: string; issue_type: string }>(
      `select count(*)::int n, min(source) source, min(issue_type) issue_type
       from public.reports where source_pickup_id = $1`, [id]);
    expect(linked).toEqual({ n: 1, source: "missed_pickup", issue_type: "missed_collection" });
    expect(await one(`select count(*)::int n from public.pickup_events where pickup_id = $1 and type = 'missed'`, [id]))
      .toEqual({ n: 1 });
  });

  it("overdue and escalation write once when run twice", async () => {
    const report = await createReport(people.residentA, ORG_A);
    await db.query(`update public.reports set due_at = now() - interval '30 hours' where id = $1`, [report]);
    for (let i = 0; i < 2; i++) {
      await db.query(`select private.job_overdue()`);
      await db.query(`select private.job_escalation()`);
    }
    const events = (await db.query<{ type: string; n: number }>(
      `select type, count(*)::int n from public.report_events where report_id = $1 and type <> 'created' group by type order by type`,
      [report],
    )).rows;
    expect(events.every((e) => e.n === 1)).toBe(true);
    expect(events.map((e) => e.type)).toContain("overdue");
    expect(await one(`select escalation_level from public.reports where id = $1`, [report])).toEqual({ escalation_level: 2 });
  });
});

describe("staff deactivation", () => {
  it("returns assigned cases and unassigns pickups only in the admin's organisation", async () => {
    const worker = await signUp("workerToDisable", ORG_A, await firstArea(ORG_A), "worker");
    const report = await createReport(people.residentA, ORG_A);
    await as(db, people.adminA, () => db.query(`select public.assign_report($1, $2)`, [report, worker]));
    const pickup = randomUUID();
    await as(db, people.residentA, () => db.query(
      `select public.create_pickup($1, 'dry', '2099-01-02', 'morning', 'Block A', '')`, [pickup]));
    await as(db, people.adminA, () => db.query(
      `select public.schedule_pickup($1, '2099-01-02', 'morning', $2)`, [pickup, worker]));
    await expect(as(db, people.adminB, () => db.query(`select public.deactivate_user($1)`, [worker])))
      .rejects.toThrow(/Not allowed/);
    await as(db, people.adminA, () => db.query(`select public.deactivate_user($1)`, [worker]));
    expect(await one(`select status, assigned_worker_id from public.reports where id = $1`, [report]))
      .toEqual({ status: "returned", assigned_worker_id: null });
    expect(await one(`select status, assigned_worker_id from public.pickup_requests where id = $1`, [pickup]))
      .toEqual({ status: "scheduled", assigned_worker_id: null });
    await as(db, people.adminA, () => db.query(`select public.reactivate_user($1)`, [worker]));
    expect(await one(`select active from public.users where id = $1`, [worker])).toEqual({ active: true });
  });
});
