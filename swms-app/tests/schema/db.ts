// Loads the Supabase migrations into PGlite (Postgres in Node) with stand-ins for the parts
// only Supabase provides: auth.users + auth.uid(), pg_cron, storage.buckets and the API roles.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Tests run from swms-app/.
const MIGRATIONS = join(process.cwd(), "supabase/migrations");

const SUPABASE_STAND_INS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  -- Supabase grants the API roles broad rights on new objects; RLS and 0009 then narrow them.
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create schema cron;
  create table cron.job (jobname text primary key, schedule text, command text);
  create function cron.schedule(n text, s text, c text) returns int language sql as
    $$ insert into cron.job values (n, s, c) on conflict (jobname) do update set schedule = s, command = c; select 1 $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STAND_INS);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    // pg_cron is a Supabase extension; the stand-in above replaces it.
    const sql = readFileSync(join(MIGRATIONS, file), "utf8").replace(/create extension if not exists pg_cron;/i, "");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${file}: ${(error as Error).message}`);
    }
  }
  return db;
}

/** Runs queries as a logged-in user (role authenticated, auth.uid() = userId) or as anon. */
export async function as<T>(db: PGlite, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}
