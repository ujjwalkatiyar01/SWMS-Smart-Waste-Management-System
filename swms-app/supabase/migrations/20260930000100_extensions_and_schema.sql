-- 0001 — 06 §2 / 0001. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

create schema if not exists private;
-- pg_cron: enable in Supabase Dashboard → Database → Extensions (or with SQL below). [Verify]
create extension if not exists pg_cron;
