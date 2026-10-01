// Worker duties, work-area check-in and driver routes (migration 1100) on the real migration files and seed.sql.

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
let areaA: string[] = [];
let areaB: string;
let today: string;

async function one<T>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows[0];
}

async function person(key: string, org: string, role: string, workerType: string | null = null) {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, `${key}@x.test`, JSON.stringify({ org_id: org, name: key })]);
  await db.query(`update public.users set role = $2, worker_type = $3 where id = $1`, [id, role, workerType]);
  people[key] = id;
}

const run = <T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) => as(db, user, () => db.query<T>(sql, params));

beforeAll(async () => {
  db = await createDb();
  await db.exec(readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8"));
  await person("admin", ORG_A, "admin");
  await person("worker", ORG_A, "worker", "collector");
  await person("worker2", ORG_A, "worker", "collector");
  await person("driver", ORG_A, "worker", "driver");
  await person("resident", ORG_A, "resident");
  await person("adminB", ORG_B, "admin");
  areaA = (await db.query<{ id: string }>(`select id from public.areas where org_id = $1 order by name`, [ORG_A])).rows.map((a) => a.id);
  areaB = (await one<{ id: string }>(`select id from public.areas where org_id = $1 limit 1`, [ORG_B])).id;
  today = (await one<{ d: string }>(`select to_char((now() at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD') d`)).d;
}, 60_000);

describe("check-in", () => {
  it("a worker checks in to an area of their organisation only", async () => {
    await run(people.worker, `select public.check_in($1)`, [areaA[0]]);
    await expect(run(people.worker, `select public.check_in($1)`, [areaB])).rejects.toThrow(/work area/);
    await expect(run(people.resident, `select public.check_in($1)`, [areaA[0]])).rejects.toThrow(/Not allowed/);
    expect((await run(people.admin, `select * from public.worker_checkins`)).rows).toHaveLength(1);
    expect((await run(people.worker2, `select * from public.worker_checkins`)).rows).toHaveLength(0);
    expect((await run(people.adminB, `select * from public.worker_checkins`)).rows).toHaveLength(0);
  });

  it("only an admin moves a worker to another work area", async () => {
    await expect(run(people.worker, `select public.set_worker_area($1, $2)`, [people.worker, areaA[1]])).rejects.toThrow(/Not allowed/);
    await run(people.admin, `select public.set_worker_area($1, $2)`, [people.worker, areaA[1]]);
    expect((await one<{ area_id: string }>(`select area_id from public.users where id = $1`, [people.worker])).area_id).toBe(areaA[1]);
    await expect(run(people.adminB, `select public.set_worker_area($1, $2)`, [people.worker, areaB])).rejects.toThrow(/Not allowed/);
  });
});

describe("duties", () => {
  let duty: string;

  it("an admin creates one duty per date; repeating the same request adds nothing", async () => {
    const place = (await one<{ id: string }>(`select id from public.locations where org_id = $1 and area_id = $2 limit 1`, [ORG_A, areaA[0]])).id;
    const create = () => run<{ create_duties: number }>(people.admin,
      `select public.create_duties($1, $2, $3, 'Clear the bins and sweep around', array[$4::date, $4::date + 1, $4::date + 2], '07:00', '11:00')`,
      [people.worker, areaA[0], place, today]);
    expect((await create()).rows[0].create_duties).toBe(3);
    expect((await create()).rows[0].create_duties).toBe(0);
    const note = await one<{ n: number }>(`select count(*)::int n from public.notifications where user_id = $1 and type = 'duty_assigned'`, [people.worker]);
    expect(note.n).toBe(1);
    duty = (await one<{ id: string }>(`select id from public.worker_duties where worker_id = $1 and duty_date = $2`, [people.worker, today])).id;
  });

  it("refuses non-admins, other organisations' workers, past dates and a place outside the area", async () => {
    const args = (worker: string, area: string, dates: string): [string, unknown[]] =>
      [`select public.create_duties($1, $2, null, 'Sweep the lane', ${dates}, '07:00', '09:00')`, [worker, area]];
    await expect(run(people.worker, ...args(people.worker, areaA[0], `array[current_date]`))).rejects.toThrow(/Not allowed/);
    await expect(run(people.adminB, ...args(people.worker, areaB, `array[current_date]`))).rejects.toThrow(/active worker/);
    await expect(run(people.admin, ...args(people.worker, areaA[0], `array[current_date - 5]`))).rejects.toThrow(/dates/);
    await expect(run(people.admin, ...args(people.resident, areaA[0], `array[current_date]`))).rejects.toThrow(/active worker/);
    const otherAreaPlace = (await one<{ id: string }>(`select id from public.locations where org_id = $1 and area_id = $2 limit 1`, [ORG_A, areaA[1]])).id;
    await expect(run(people.admin, `select public.create_duties($1, $2, $3, 'Sweep the lane', array[current_date], '07:00', '09:00')`,
      [people.worker, areaA[0], otherAreaPlace])).rejects.toThrow(/place in this area/);
  });

  it("each worker sees only their own duties", async () => {
    expect((await run(people.worker, `select id from public.worker_duties`)).rows).toHaveLength(3);
    expect((await run(people.worker2, `select id from public.worker_duties`)).rows).toHaveLength(0);
    expect((await run(people.resident, `select id from public.worker_duties`)).rows).toHaveLength(0);
    await expect(run(people.worker, `update public.worker_duties set status = 'done' where id = $1`, [duty])).rejects.toThrow();
  });

  it("start today → done only with an after-photo in the duty's folder", async () => {
    const tomorrow = (await one<{ id: string }>(`select id from public.worker_duties where worker_id = $1 and duty_date = $2::date + 1`, [people.worker, today])).id;
    await expect(run(people.worker, `select public.start_duty($1)`, [tomorrow])).rejects.toThrow(/cannot be started/);
    await expect(run(people.worker2, `select public.start_duty($1)`, [duty])).rejects.toThrow(/cannot be started/);
    await expect(run(people.worker, `select public.complete_duty($1, $2)`, [duty, `${ORG_A}/duties/${duty}/after.jpg`])).rejects.toThrow(/Start this duty/);
    await run(people.worker, `select public.start_duty($1, 26.4, 80.3)`, [duty]);
    await expect(run(people.worker, `select public.complete_duty($1, $2)`, [duty, `${ORG_A}/reports/x/after.jpg`])).rejects.toThrow(/after-photo/);
    await run(people.worker, `select public.complete_duty($1, $2, 'Done, 3 bags', 26.4, 80.3)`, [duty, `${ORG_A}/duties/${duty}/after.jpg`]);
    const row = await one<{ status: string; done_note: string }>(`select status, done_note from public.worker_duties where id = $1`, [duty]);
    expect(row).toEqual({ status: "done", done_note: "Done, 3 bags" });
  });

  it("an admin cancels only a duty that has not started", async () => {
    await expect(run(people.admin, `select public.cancel_duty($1)`, [duty])).rejects.toThrow(/not started/);
    const later = (await one<{ id: string }>(`select id from public.worker_duties where worker_id = $1 and duty_date = $2::date + 2`, [people.worker, today])).id;
    await run(people.admin, `select public.cancel_duty($1)`, [later]);
    expect((await one<{ status: string }>(`select status from public.worker_duties where id = $1`, [later])).status).toBe("cancelled");
  });
});

describe("driver routes", () => {
  let trip: string;

  it("a trip records from / to areas, its route points and the distance; jitter is ignored", async () => {
    await db.query(`insert into public.vehicles (org_id, number, kind) values ($1, 'UP78 R 1', 'truck')`, [ORG_A]);
    const code = (await one<{ qr_code: string }>(`select qr_code from public.vehicles where number = 'UP78 R 1'`)).qr_code;
    await expect(run(people.driver, `select public.start_trip($1, 'typed', $2, $3, 26.45, 80.33, 10)`, [code, areaA[0], areaB])).rejects.toThrow(/where the trip starts/);
    trip = (await run<{ start_trip: string }>(people.driver, `select public.start_trip($1, 'typed', $2, $3, 26.45, 80.33, 10)`, [code, areaA[0], areaA[1]])).rows[0].start_trip;
    await run(people.driver, `select public.update_trip_position($1, 26.45001, 80.33001, 8)`, [trip]); // ~1.5 m: jitter
    await run(people.driver, `select public.update_trip_position($1, 26.4510, 80.33, 8)`, [trip]);   // ~111 m
    await run(people.driver, `select public.end_trip($1, 26.4520, 80.33)`, [trip]);                  // ~111 m
    const t = await one<{ distance_m: number }>(`select distance_m from public.vehicle_trips where id = $1`, [trip]);
    expect(Math.round(t.distance_m / 10)).toBe(22); // about 222 m
    expect((await run(people.driver, `select id from public.trip_points where trip_id = $1`, [trip])).rows).toHaveLength(3);
  });

  it("the route and trip history are for the driver, admins and supervisors only", async () => {
    expect((await run(people.resident, `select id from public.trip_points`)).rows).toHaveLength(0);
    expect((await run(people.worker, `select id from public.trip_points`)).rows).toHaveLength(0);
    const history = await run<{ from_area: string; to_area: string; points: number }>(people.admin, `select * from public.get_trip_history(7)`);
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].points).toBe(3);
    expect(history.rows[0].from_area).not.toBe(history.rows[0].to_area);
    expect((await run(people.resident, `select * from public.get_trip_history(7)`)).rows).toHaveLength(0);
    expect((await run(people.adminB, `select * from public.get_trip_history(7)`)).rows).toHaveLength(0);
  });

  it("route points are not written to the setup audit history", async () => {
    const n = await one<{ n: number }>(`select count(*)::int n from public.admin_audit_log where record_id = $1`, [trip]);
    expect(n.n).toBe(2); // start + end
  });
});
