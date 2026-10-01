// Case lifecycle functions (06 §8.2, migration 0011) on the real migration files and seed.sql.

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

async function signUp(key: string, org: string, role = "resident") {
  const area = (await one<{ id: string }>(`select id from public.areas where org_id = $1 order by name limit 1`, [org])).id;
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `${key}@example.test`,
    JSON.stringify({ org_id: org, area_id: area, name: key }),
  ]);
  if (role !== "resident") await db.query(`update public.users set role = $2 where id = $1`, [id, role]);
  people[key] = id;
  return id;
}

async function bin(org: string) {
  return one<{ id: string; lat: number; lng: number }>(
    `select id, lat, lng from public.locations where org_id = $1 and kind = 'bin' order by name limit 1`,
    [org],
  );
}

let counter = 0;
/** A new resident with one report at a registered bin (fresh resident each time: daily report limit). */
async function newCase(org = ORG_A, withLocation = true) {
  const reporter = await signUp(`reporter${++counter}`, org);
  const place = await bin(org);
  const id = randomUUID();
  await as(db, reporter, () =>
    db.query(
      `select public.create_report($1, 'overflowing_bin', $2, 'Bin full', $3, $4, $5, 12, $6, 'dry')`,
      [id, `${org}/reports/${id}/before.jpg`, withLocation ? place.id : null, place.lat, place.lng, withLocation ? "registered" : "gps"],
    ),
  );
  return { id, reporter };
}

const status = async (id: string) => (await one<{ status: string }>(`select status from public.reports where id = $1`, [id])).status;
const events = async (id: string) =>
  (await db.query<{ type: string }>(`select type from public.report_events where report_id = $1 order by created_at, id`, [id])).rows.map((e) => e.type);

async function assign(id: string, worker = people.worker) {
  await as(db, people.admin, () => db.query(`select public.assign_report($1, $2)`, [id, worker]));
}

async function sendToReview(id: string) {
  await assign(id);
  const place = await bin(ORG_A);
  await as(db, people.worker, () =>
    db.query(`select public.complete_report($1, $2, 'Cleaned', $3, $4)`, [id, `${ORG_A}/reports/${id}/after.jpg`, place.lat, place.lng]),
  );
}

beforeAll(async () => {
  db = await createDb();
  await db.exec(readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8"));
  await signUp("admin", ORG_A, "admin");
  await signUp("worker", ORG_A, "worker");
  await signUp("worker2", ORG_A, "worker");
  await signUp("supervisor", ORG_A, "supervisor");
  await signUp("adminB", ORG_B, "admin");
}, 60_000);

describe("reject_report", () => {
  it("lets an admin reject a submitted report with a reason, and tells the reporter", async () => {
    const c = await newCase();
    await as(db, people.admin, () => db.query(`select public.reject_report($1, 'Duplicate of another report')`, [c.id]));
    expect(await one(`select status, close_reason from public.reports where id = $1`, [c.id])).toEqual({
      status: "rejected",
      close_reason: "Duplicate of another report",
    });
    expect(await events(c.id)).toContain("rejected");
    expect(await one(`select count(*)::int n from public.notifications where user_id = $1 and type = 'rejected'`, [c.reporter])).toEqual({ n: 1 });
  });

  it("needs a reason, the right status, the right role and the right organisation", async () => {
    const c = await newCase();
    await expect(as(db, people.admin, () => db.query(`select public.reject_report($1, '  ')`, [c.id]))).rejects.toThrow(/Add a reason/);
    await expect(as(db, c.reporter, () => db.query(`select public.reject_report($1, 'x')`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, people.adminB, () => db.query(`select public.reject_report($1, 'x')`, [c.id]))).rejects.toThrow(/Not allowed/);
    await assign(c.id);
    await expect(as(db, people.admin, () => db.query(`select public.reject_report($1, 'x')`, [c.id]))).rejects.toThrow(/current status/);
  });
});

describe("correct_issue_type", () => {
  it("changes the type, recomputes the due time from the report time and logs the change", async () => {
    const c = await newCase();
    await as(db, people.admin, () => db.query(`select public.correct_issue_type($1, 'illegal_dumping')`, [c.id]));
    const r = await one<{ issue_type: string; ok: boolean }>(
      `select issue_type, due_at = private.due_at_for(org_id, 'illegal_dumping', waste_category, created_at) as ok
       from public.reports where id = $1`,
      [c.id],
    );
    expect(r).toEqual({ issue_type: "illegal_dumping", ok: true });
    expect(await events(c.id)).toContain("type_changed");
  });

  it("refuses unknown types and non-admins", async () => {
    const c = await newCase();
    await expect(as(db, people.admin, () => db.query(`select public.correct_issue_type($1, 'nonsense')`, [c.id]))).rejects.toThrow(/Invalid issue type/);
    await expect(as(db, c.reporter, () => db.query(`select public.correct_issue_type($1, 'other')`, [c.id]))).rejects.toThrow(/Not allowed/);
  });
});

describe("return_report", () => {
  it("lets the assigned worker return a task, keeps the due time, and the admin can reassign", async () => {
    const c = await newCase();
    await assign(c.id);
    const before = await one<{ due_at: string }>(`select due_at from public.reports where id = $1`, [c.id]);
    await as(db, people.worker, () => db.query(`select public.return_report($1, 'Site is locked')`, [c.id]));
    expect(await one(`select status, assigned_worker_id from public.reports where id = $1`, [c.id])).toEqual({ status: "returned", assigned_worker_id: null });
    expect(await one(`select due_at from public.reports where id = $1`, [c.id])).toEqual(before);
    await assign(c.id, people.worker2);
    expect(await status(c.id)).toBe("assigned");
  });

  it("refuses another worker, a missing reason and a case that is not assigned", async () => {
    const c = await newCase();
    await assign(c.id);
    await expect(as(db, people.worker2, () => db.query(`select public.return_report($1, 'x')`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, people.worker, () => db.query(`select public.return_report($1, '')`, [c.id]))).rejects.toThrow(/Add a reason/);
    const other = await newCase();
    await expect(as(db, people.worker, () => db.query(`select public.return_report($1, 'x')`, [other.id]))).rejects.toThrow(/Not allowed/);
  });
});

describe("close_report", () => {
  const points = async (id: string) => (await one<{ n: number }>(`select count(*)::int n from public.reward_events where report_id = $1`, [id])).n;

  it("closes a disputed case as valid and awards points once", async () => {
    const c = await newCase();
    await sendToReview(c.id);
    await as(db, c.reporter, () => db.query(`select public.submit_feedback($1, 'not_resolved', 'Still there')`, [c.id]));
    expect(await status(c.id)).toBe("disputed");
    await as(db, people.admin, () => db.query(`select public.close_report($1, 'Checked on site: fixed', true)`, [c.id]));
    expect(await one(`select status, closed_as_valid, close_reason from public.reports where id = $1`, [c.id])).toEqual({
      status: "closed",
      closed_as_valid: true,
      close_reason: "Checked on site: fixed",
    });
    expect(await points(c.id)).toBeGreaterThan(0);
  });

  it("awards nothing when the admin marks the close as not valid", async () => {
    const c = await newCase();
    await sendToReview(c.id);
    await as(db, people.admin, () => db.query(`select public.close_report($1, 'No reply from resident', false)`, [c.id]));
    expect(await status(c.id)).toBe("closed");
    expect(await points(c.id)).toBe(0);
  });

  it("refuses wrong status, wrong role and a missing reason", async () => {
    const c = await newCase();
    await expect(as(db, people.admin, () => db.query(`select public.close_report($1, 'x', true)`, [c.id]))).rejects.toThrow(/current status/);
    await sendToReview(c.id);
    await expect(as(db, c.reporter, () => db.query(`select public.close_report($1, 'x', true)`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, people.admin, () => db.query(`select public.close_report($1, ' ', true)`, [c.id]))).rejects.toThrow(/Add a reason/);
  });
});

describe("reopen_report", () => {
  async function closedCase() {
    const c = await newCase();
    await sendToReview(c.id);
    await as(db, c.reporter, () => db.query(`select public.submit_feedback($1, 'resolved', 'ok')`, [c.id]));
    return c;
  }

  it("reopens inside the window and counts the reopening", async () => {
    const c = await closedCase();
    await as(db, c.reporter, () => db.query(`select public.reopen_report($1, 'It came back', null)`, [c.id]));
    expect(await one(`select status, reopen_count from public.reports where id = $1`, [c.id])).toEqual({ status: "reopened", reopen_count: 1 });
    expect(await events(c.id)).toContain("reopened");
  });

  it("refuses after the window, for someone else, without a reason and with a photo from another report", async () => {
    const c = await closedCase();
    await expect(as(db, people.worker, () => db.query(`select public.reopen_report($1, 'x', null)`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, c.reporter, () => db.query(`select public.reopen_report($1, '', null)`, [c.id]))).rejects.toThrow(/Add a reason/);
    await expect(
      as(db, c.reporter, () => db.query(`select public.reopen_report($1, 'x', $2)`, [c.id, `${ORG_A}/reports/${randomUUID()}/evidence-1.jpg`])),
    ).rejects.toThrow(/Invalid photo/);
    await db.query(`update public.reports set closed_at = now() - interval '10 days' where id = $1`, [c.id]);
    await expect(as(db, c.reporter, () => db.query(`select public.reopen_report($1, 'Late', null)`, [c.id]))).rejects.toThrow(/reopen window/);
  });
});

describe("follow_report and add_evidence", () => {
  it("lets another resident follow an open case at a registered place, once, and never their own", async () => {
    const c = await newCase();
    const follower = await signUp(`follower${++counter}`, ORG_A);
    for (let i = 0; i < 2; i++) await as(db, follower, () => db.query(`select public.follow_report($1)`, [c.id]));
    expect(await one(`select count(*)::int n from public.report_followers where report_id = $1`, [c.id])).toEqual({ n: 1 });
    await expect(as(db, c.reporter, () => db.query(`select public.follow_report($1)`, [c.id]))).rejects.toThrow(/Not allowed/);
    const seen = await as(db, follower, () => db.query(`select id from public.reports where id = $1`, [c.id]));
    expect(seen.rows).toHaveLength(0); // followers get the summary only (P1)
    const summary = await as(db, follower, () => db.query(`select status from public.case_summary($1)`, [c.id]));
    expect(summary.rows).toHaveLength(1);
  });

  it("refuses following from another organisation, a GPS-only case and a closed case", async () => {
    const c = await newCase();
    const outsider = await signUp(`outsider${++counter}`, ORG_B);
    await expect(as(db, outsider, () => db.query(`select public.follow_report($1)`, [c.id]))).rejects.toThrow(/Not allowed/);
    const gps = await newCase(ORG_A, false);
    const follower = await signUp(`follower${++counter}`, ORG_A);
    await expect(as(db, follower, () => db.query(`select public.follow_report($1)`, [gps.id]))).rejects.toThrow(/Not allowed/);
    await as(db, people.admin, () => db.query(`select public.reject_report($1, 'x')`, [c.id]));
    await expect(as(db, follower, () => db.query(`select public.follow_report($1)`, [c.id]))).rejects.toThrow(/Not allowed/);
  });

  it("lets the reporter and a follower add evidence to an open case, but nobody else", async () => {
    const c = await newCase();
    const follower = await signUp(`follower${++counter}`, ORG_A);
    await as(db, follower, () => db.query(`select public.follow_report($1)`, [c.id]));
    const photo = `${ORG_A}/reports/${c.id}/evidence-1.jpg`;
    await as(db, c.reporter, () => db.query(`select public.add_evidence($1, $2, 'Now worse')`, [c.id, photo]));
    await as(db, follower, () => db.query(`select public.add_evidence($1, null, 'I saw it too')`, [c.id]));
    expect((await events(c.id)).filter((t) => t === "evidence_added")).toHaveLength(2);
    const stranger = await signUp(`stranger${++counter}`, ORG_A);
    await expect(as(db, stranger, () => db.query(`select public.add_evidence($1, null, 'hi')`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, c.reporter, () => db.query(`select public.add_evidence($1, null, '')`, [c.id]))).rejects.toThrow(/photo or a note/);
    await expect(
      as(db, c.reporter, () => db.query(`select public.add_evidence($1, $2, null)`, [c.id, `${ORG_A}/reports/${c.id}/before.jpg`])),
    ).rejects.toThrow(/Invalid photo/);
  });
});

describe("add_instruction", () => {
  it("lets a supervisor add an instruction and notifies the admin and the assigned worker", async () => {
    const c = await newCase();
    await assign(c.id);
    await as(db, people.supervisor, () => db.query(`select public.add_instruction($1, 'Send a second worker')`, [c.id]));
    expect(await events(c.id)).toContain("instruction");
    expect(await one(`select count(*)::int n from public.notifications where user_id = $1 and type = 'instruction'`, [people.worker])).toEqual({ n: 1 });
  });

  it("refuses residents, workers and other organisations", async () => {
    const c = await newCase();
    for (const who of [c.reporter, people.worker, people.adminB]) {
      await expect(as(db, who, () => db.query(`select public.add_instruction($1, 'x')`, [c.id]))).rejects.toThrow(/Not allowed/);
    }
  });
});

describe("add_delay_note", () => {
  it("is allowed only when the case is overdue, for the admin and the assigned worker", async () => {
    const c = await newCase();
    await assign(c.id);
    await expect(as(db, people.admin, () => db.query(`select public.add_delay_note($1, 'Rain', 'Tomorrow')`, [c.id]))).rejects.toThrow(/not overdue/);
    await db.query(`update public.reports set due_at = now() - interval '2 hours' where id = $1`, [c.id]);
    await as(db, people.admin, () => db.query(`select public.add_delay_note($1, 'Heavy rain', 'Extra team tomorrow')`, [c.id]));
    await as(db, people.worker, () => db.query(`select public.add_delay_note($1, 'Truck broke down', 'Repair then collect')`, [c.id]));
    const notes = (await db.query<{ data: { next_step: string } }>(`select data from public.report_events where report_id = $1 and type = 'delay_note' order by created_at, id`, [c.id])).rows;
    // Both notes can share one timestamp, so compare without relying on order.
    expect(notes.map((n) => n.data.next_step).sort()).toEqual(["Extra team tomorrow", "Repair then collect"]);
  });

  it("refuses other workers, residents and missing details, and leaves the due time alone", async () => {
    const c = await newCase();
    await assign(c.id);
    await db.query(`update public.reports set due_at = now() - interval '2 hours' where id = $1`, [c.id]);
    const due = await one(`select due_at from public.reports where id = $1`, [c.id]);
    await expect(as(db, people.worker2, () => db.query(`select public.add_delay_note($1, 'a', 'b')`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, c.reporter, () => db.query(`select public.add_delay_note($1, 'a', 'b')`, [c.id]))).rejects.toThrow(/Not allowed/);
    await expect(as(db, people.admin, () => db.query(`select public.add_delay_note($1, 'a', '')`, [c.id]))).rejects.toThrow(/reason and a next step/);
    expect(await one(`select due_at from public.reports where id = $1`, [c.id])).toEqual(due);
  });
});

describe("permissions on the new functions", () => {
  it("are not callable by logged-out visitors", async () => {
    const c = await newCase();
    await expect(as(db, null, () => db.query(`select public.reject_report($1, 'x')`, [c.id]))).rejects.toThrow(/permission denied/);
    await expect(as(db, null, () => db.query(`select public.follow_report($1)`, [c.id]))).rejects.toThrow(/permission denied/);
  });
});
