// Verified staff sign-up (migration 0800) and live vehicle tracking (0900) on the real migration files and seed.sql.

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

async function one<T>(sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows[0];
}

/** Inserts into auth.users as Supabase Auth would; the trigger builds the profile. */
async function authSignUp(email: string, org: string, meta: Record<string, string> = {}) {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id, email, JSON.stringify({ org_id: org, name: email.split("@")[0], ...meta }),
  ]);
  return id;
}

const profile = (id: string) =>
  one<{ role: string; worker_type: string | null; staff_id: string | null }>(`select role, worker_type, staff_id from public.users where id = $1`, [id]);

async function addStaffId(admin: string, staffId: string, email: string, role: string, type: string | null = null) {
  return as(db, admin, () => db.query(`select public.add_staff_id($1, $2, $3, $4)`, [staffId, email, role, type]));
}

beforeAll(async () => {
  db = await createDb();
  await db.exec(readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8"));
  people.admin = await authSignUp("admin@a.test", ORG_A);
  people.adminB = await authSignUp("admin@b.test", ORG_B);
  people.resident = await authSignUp("resident@a.test", ORG_A);
  await db.query(`update public.users set role = 'admin' where id = any($1)`, [[people.admin, people.adminB]]);
}, 60_000);

describe("verified staff sign-up", () => {
  it("creates a resident when no staff ID is given", async () => {
    expect((await profile(people.resident)).role).toBe("resident");
  });

  it("only an admin can add staff IDs", async () => {
    await expect(addStaffId(people.resident, "CWA-X-1", "x@a.test", "admin")).rejects.toThrow(/Not allowed/);
    await addStaffId(people.admin, "cwa-drv-201", "driver@a.test", "worker", "driver");
    await addStaffId(people.admin, "CWA-ADM-002", "boss@a.test", "admin");
    await expect(addStaffId(people.admin, "CWA-DRV-201", "other@a.test", "worker", "collector")).rejects.toThrow(/already listed/);
  });

  it("rejects a wrong staff ID, a wrong email, a wrong role or a wrong worker type", async () => {
    const tries: [string, Record<string, string>][] = [
      ["driver@a.test", { staff_id: "CWA-DRV-999", staff_role: "worker", worker_type: "driver" }],
      ["someone@a.test", { staff_id: "CWA-DRV-201", staff_role: "worker", worker_type: "driver" }],
      ["driver@a.test", { staff_id: "CWA-DRV-201", staff_role: "admin" }],
      ["driver@a.test", { staff_id: "CWA-DRV-201", staff_role: "worker", worker_type: "collector" }],
    ];
    for (const [email, meta] of tries) await expect(authSignUp(email, ORG_A, meta)).rejects.toThrow(/Staff ID not verified/);
  });

  it("an ID from another organisation does not verify", async () => {
    await expect(authSignUp("driver@a.test", ORG_B, { staff_id: "CWA-DRV-201", staff_role: "worker", worker_type: "driver" }))
      .rejects.toThrow(/Staff ID not verified/);
  });

  it("a matching ID gives the listed role and type, notifies admins and cannot be used twice", async () => {
    people.driver = await authSignUp("Driver@A.test", ORG_A, { staff_id: "cwa-drv-201", staff_role: "worker", worker_type: "driver" });
    expect(await profile(people.driver)).toEqual({ role: "worker", worker_type: "driver", staff_id: "CWA-DRV-201" });
    const note = await one<{ n: number }>(`select count(*)::int n from public.notifications where user_id = $1 and type = 'staff_signup'`, [people.admin]);
    expect(note.n).toBe(1);
    await expect(authSignUp("driver@a.test", ORG_A, { staff_id: "CWA-DRV-201", staff_role: "worker", worker_type: "driver" }))
      .rejects.toThrow();
    people.boss = await authSignUp("boss@a.test", ORG_A, { staff_id: "CWA-ADM-002", staff_role: "admin" });
    expect((await profile(people.boss)).role).toBe("admin");
  });

  it("users cannot change their own role, staff ID or worker type", async () => {
    await expect(as(db, people.resident, () => db.query(`update public.users set role = 'admin' where id = $1`, [people.resident]))).rejects.toThrow();
    await expect(as(db, people.driver, () => db.query(`update public.users set worker_type = 'collector' where id = $1`, [people.driver]))).rejects.toThrow();
  });

  it("only the organisation's admins read the list; used entries cannot be removed", async () => {
    const seen = (user: string) => as(db, user, () => db.query(`select staff_id from public.staff_roster`)).then((r) => r.rows.length);
    expect(await seen(people.admin)).toBe(2);
    expect(await seen(people.adminB)).toBe(0);
    expect(await seen(people.resident)).toBe(0);
    const used = await one<{ id: string }>(`select id from public.staff_roster where staff_id = 'CWA-DRV-201'`);
    await expect(as(db, people.admin, () => db.query(`select public.remove_staff_id($1)`, [used.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, people.resident, () => db.query(`insert into public.staff_roster (org_id, staff_id, email, role) values ($1, 'HACK-1', 'h@a.test', 'admin')`, [ORG_A]))).rejects.toThrow();
  });
});

describe("live vehicle tracking", () => {
  let code: string;
  let trip: string;

  beforeAll(async () => {
    await addStaffId(people.admin, "CWA-COL-101", "collector@a.test", "worker", "collector");
    people.collector = await authSignUp("collector@a.test", ORG_A, { staff_id: "CWA-COL-101", staff_role: "worker", worker_type: "collector" });
    await db.query(`insert into public.vehicles (org_id, number, kind) values ($1, 'UP78 T 1', 'truck'), ($2, 'UP78 T 2', 'truck')`, [ORG_A, ORG_B]);
    code = (await one<{ qr_code: string }>(`select qr_code from public.vehicles where number = 'UP78 T 1'`)).qr_code;
  });

  it("vehicle codes are hidden from clients and printed only for admins", async () => {
    await expect(as(db, people.driver, () => db.query(`select qr_code from public.vehicles`))).rejects.toThrow();
    const sheet = (user: string) => as(db, user, () => db.query(`select * from public.get_vehicle_qr_sheet()`)).then((r) => r.rows.length);
    expect(await sheet(people.admin)).toBe(1);
    expect(await sheet(people.driver)).toBe(0);
  });

  it("only a driver with a valid code from their organisation can start a trip", async () => {
    const areas = (await db.query<{ id: string }>(`select id from public.areas where org_id = $1 order by name limit 2`, [ORG_A])).rows.map((a) => a.id);
    const start = (user: string, c: string) => as(db, user, () => db.query<{ start_trip: string }>(`select public.start_trip($1, 'camera', $2, $3, 26.45, 80.33, 10)`, [c, areas[0], areas[1]]));
    await expect(start(people.collector, code)).rejects.toThrow(/Only a driver/);
    await expect(start(people.resident, code)).rejects.toThrow(/Only a driver/);
    await expect(start(people.driver, "0".repeat(32))).rejects.toThrow(/not recognised/);
    const other = (await one<{ qr_code: string }>(`select qr_code from public.vehicles where number = 'UP78 T 2'`)).qr_code;
    await expect(start(people.driver, other)).rejects.toThrow(/not recognised/);
    trip = (await start(people.driver, code)).rows[0].start_trip;
    expect((await start(people.driver, code)).rows[0].start_trip).toBe(trip); // repeat scan → same trip
  });

  it("the driver's position is visible to everyone in the organisation, names only to staff", async () => {
    const audited = async () => (await one<{ n: number }>(`select count(*)::int n from public.admin_audit_log where record_id = $1`, [trip])).n;
    const before = await audited();
    await as(db, people.driver, () => db.query(`select public.update_trip_position($1, 26.46, 80.34, 8)`, [trip]));
    expect(await audited()).toBe(before); // position updates stay out of the setup audit history (1000)
    const live = (user: string) => as(db, user, () => db.query<{ lat: number; driver_first_name: string | null; is_mine: boolean }>(`select * from public.get_live_vehicles()`)).then((r) => r.rows);
    const forResident = await live(people.resident);
    expect(forResident).toHaveLength(1);
    expect(forResident[0].lat).toBe(26.46);
    expect(forResident[0].driver_first_name).toBeNull();
    expect((await live(people.collector))[0].driver_first_name).toBe("Driver");
    expect((await live(people.driver))[0].is_mine).toBe(true);
    expect(await live(people.adminB)).toHaveLength(0);
  });

  it("nobody else can move or end the trip; after the end it disappears", async () => {
    await expect(as(db, people.collector, () => db.query(`select public.update_trip_position($1, 1, 1)`, [trip]))).rejects.toThrow(/ended/);
    await expect(as(db, people.admin, () => db.query(`select public.end_trip($1)`, [trip]))).rejects.toThrow(/ended/);
    await as(db, people.driver, () => db.query(`select public.end_trip($1, 26.47, 80.35)`, [trip]));
    await expect(as(db, people.driver, () => db.query(`select public.update_trip_position($1, 1, 1)`, [trip]))).rejects.toThrow(/ended/);
    const events = await db.query<{ type: string }>(`select type from public.trip_events where trip_id = $1 order by created_at`, [trip]);
    expect(events.rows.map((e) => e.type)).toEqual(["start", "end"]);
    const audit = await db.query<{ action: string }>(`select action from public.admin_audit_log where record_id = $1 order by created_at`, [trip]);
    expect(audit.rows.map((a) => a.action)).toEqual(["insert", "update"]); // start, end
    expect((await as(db, people.resident, () => db.query(`select * from public.get_live_vehicles()`))).rows).toHaveLength(0);
  });
});
