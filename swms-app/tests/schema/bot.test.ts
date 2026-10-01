import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb } from "./db";

const ORG = "eb1cf32b-47a8-5ec9-aee6-c241bb18eef8";
let db: PGlite;
let worker: string;

beforeAll(async () => {
  db = await createDb();
  await db.exec(readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8"));
  worker = randomUUID();
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [worker, "bot-worker@example.test", JSON.stringify({ org_id: ORG, name: "Bot worker" })]);
  await db.query("update public.users set role = 'worker' where id = $1", [worker]);
}, 60_000);

describe("SWMS bot model quota", () => {
  it("reserves and audits a worker call, with no raw question stored", async () => {
    const id = (await db.query<{ reserve_bot_run: string }>("select public.reserve_bot_run($1, $2)", [worker, "test-model"])).rows[0].reserve_bot_run;
    const row = (await db.query<{ feature: string; user_id: string; output_json: unknown }>("select feature, user_id, output_json from public.ai_runs where id = $1", [id])).rows[0];
    expect(row).toEqual({ feature: "chat", user_id: worker, output_json: null });
  });

  it("does not let a browser session reserve calls for itself or another user", async () => {
    await expect(as(db, worker, () => db.query("select public.reserve_bot_run($1, $2)", [worker, "test-model"]))).rejects.toThrow();
  });

  it("does not reserve for a deactivated user and enforces the daily limit", async () => {
    await db.query("update public.organizations set ai_daily_limit_per_user = 1 where id = $1", [ORG]);
    await expect(db.query("select public.reserve_bot_run($1, $2)", [worker, "test-model"])).rejects.toThrow(/AI limit reached/);
    await db.query("update public.users set active = false where id = $1", [worker]);
    await expect(db.query("select public.reserve_bot_run($1, $2)", [worker, "test-model"])).rejects.toThrow(/Not allowed/);
  });
});
