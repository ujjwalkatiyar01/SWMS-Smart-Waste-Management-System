# 3 · Database Tech Stack

| | |
|---|---|
| **Part of** | [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) |
| **Version** | v1 — 2026-09-30 · **Final** — stack approved by the team (2026-09-30) |
| **Source of truth for SQL** | [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md) v1.2 (tested: 48/48 checks in PGlite). This file explains the database part of the stack; it does not repeat the SQL. |
| **Labels** | [Doc] official docs · [Rec] recommendation · [Verify] confirm at setup · (demo) sample value · 🆕 named while splitting |

## 0. Cross-check before coding (mandatory)

1. Read [00-FULL-TECH-STACK.md](00-FULL-TECH-STACK.md) and [../04-TECH-STACK.md](../04-TECH-STACK.md).
2. Check whether any database tool, table, rule or job there is missing from this file or from 06.
3. Cross-check with the full docs: [../03-FULL-APP-FLOW.md](../03-FULL-APP-FLOW.md) (§6 status diagrams, §7 permissions, §8 data model, §9 jobs), [../05-AI-SPEC.md](../05-AI-SPEC.md) (A2–A8 rules), [../06-PHYSICAL-SCHEMA.md](../06-PHYSICAL-SCHEMA.md).
4. Also read: [02-BACKEND.md](02-BACKEND.md), [04-AUTH.md](04-AUTH.md), [07-BACKGROUND-JOBS.md](07-BACKGROUND-JOBS.md).
5. Missing something → add it here and in 06 (🆕, log it in the project change log), then implement. Nothing missing → implement. Documents disagree → stop and ask.

**Requirements covered (04 §3):** 2 (per-record authorization), 3 (relational database), 7 (aggregations), 8 (time zone), 15 (distance), with jobs: 5.

---

## 1. Tools

| Tool | Used for | Why |
|---|---|---|
| **Supabase Postgres** | All app data | Relational; joins and aggregates for dashboards and hotspots [Rec] |
| **Row Level Security (RLS)** | Who can read which rows | Enforced inside the database; no data visible until a rule allows it [Doc] |
| **Column grants** | Hide `locations.qr_code`; users may update only some own columns | Finer than rows (06 §7.3) |
| **PL/pgSQL functions** (`security definer`, empty `search_path`) | Every case change; safe read summaries; helpers | One transaction per change; rules in one place [Rec] |
| **Triggers** | Sign-up profile, setup audit log, `updated_at` | Automatic, cannot be skipped |
| **pg_cron** | 7 jobs (see [07-BACKGROUND-JOBS.md](07-BACKGROUND-JOBS.md)) | Inside the database [Doc] |
| **Supabase CLI** | Local database, migrations, `supabase gen types typescript` | Versioned, repeatable schema (G7) |
| **PGlite** (tests only) | Fast schema smoke test in Node (48 checks written) | Runs without Docker; not a replacement for testing on Supabase |

---

## 2. Tables (22)

| Group | Tables |
|---|---|
| Identity | `organizations` (all settings), `areas`, `users`, `admin_audit_log` |
| Cases | `locations`, `reports`, `report_events`, `report_followers` |
| Pickups | `pickup_requests`, `pickup_events` |
| Collection | `collection_schedules`, `collection_runs`, `vehicles`, `vehicle_trips`, `trip_stops`, `trip_events` |
| Insights | `prevention_reviews` |
| Notifications | `notifications` |
| Intelligence 🧠 | `ai_runs`, `location_risk`, `performance_flags`, `reward_events` |

Conventions: `uuid` ids · `org_id` on every table · `timestamptz` (UTC) · status values as `text` + `check` · `*_url` columns hold storage paths, never public links · append-only history tables (`report_events`, `pickup_events`, `trip_events`, `reward_events`, `admin_audit_log`).

---

## 3. Rules the database enforces

| Rule | How |
|---|---|
| Organisation isolation | Every access rule checks `org_id`; links between tables must stay in the same organisation (composite keys, 06 I1) |
| Who sees what | RLS per role (06 §7.1): residents own cases; workers assigned; admin/supervisor organisation. 🆕 (P1) Followers and the higher authority get summaries only through functions — no photos, notes, feedback or names |
| Changes only through functions | No insert/update rights on case tables for users; functions check role, organisation, ownership and the allowed transition (03 §6) |
| Timeline + notifications | Written by the same function, same transaction |
| Deadlines | `due_at` from type deadline or the hazardous deadline (demo 6 h) |
| Distance | `distance_m()` haversine: far-from-site (demo 100 m), disposal geofence (demo 150 m), unapproved stops (G2) |
| Rewards | Only verified resident reports; each reason once per report (unique key) |
| Distinct incidents 🆕 (R6) | `is_new_incident` false when a case was already open at that place; hotspot counts and risk score use it |
| Location evidence 🆕 (R1) | Raw phone GPS kept apart from the corrected incident location; mismatch flag |
| Feedback per attempt 🆕 (R2, R3) | Optional satisfaction; `feedback` event with attempt number |
| Limits | Daily reports, open pickups, AI calls (per user / organisation), text lengths, setting ranges |
| No deletes of setup records | Deactivate instead (06 I3) |
| Setup history | `admin_audit_log` triggers on settings, areas, locations, vehicles, schedules, users (role/active/area), trips, prevention reviews |

---

## 4. Functions the app calls

- **Change functions (06 §8.1, §8.2):** reports (create, edit, cancel, reject, correct type, set category, assign, complete, return, feedback, close, reopen, follow, instruction) · 🆕 `add_evidence`, `add_delay_note` · pickups (create, edit, cancel, schedule, reschedule, decline, collect, refuse) · trips (start, stop, disposal scan, end) · users (deactivate, reactivate) · flags (review) · `save_ai_run` (server only).
- **Read functions (06 §6, §8.1b, §8.3):** `list_orgs_for_signup`, `list_areas_for_signup`, `open_case_at`, `case_people`, 🆕 `case_summary`, `followed_cases`, `authority_cases`, `ai_quota_left`, `resolve_qr`, `get_qr_sheet`, `get_dashboard_counts`, `get_scorecards`, `get_leaderboard`, `get_vehicle_eta`, `get_next_collection`, `get_job_health`.
- **Written in full SQL and tested:** `create_report`, `assign_report`, `complete_report`, `submit_feedback`, `award_points`, `open_case_at`, `case_people`, jobs overdue / escalation / hotspot risk. **Written as rules (to code in the build):** the rest.

---

## 5. Performance

- Indexes on `org_id`, status, foreign keys and time columns used by rules and dashboards (06 §4).
- Access rules call `(select auth.uid())` and helpers inside `select` so they run once per query [Doc].
- Dashboards use aggregate functions instead of loading rows into the app.

---

## 6. Seed and demo data

- `supabase/seed.sql`: both demo organisations (City Ward, Residential Society), areas, locations, disposal sites with QR tokens, schedules, vehicles, cases in every status, pickups, trips (one verified, one outside geofence), flags, risk scores — times **relative to `now()`** (G3).
- `scripts/seed-users`: creates one login per role per organisation through the Auth admin API.
- `scripts/reset-demo`: clears the demo organisations and re-runs both (08-DEVOPS).

---

## 7. Where it lives

```
supabase/migrations/0001 … 0009   (order in 06 §2, incl. 0002b integrity)
supabase/seed.sql
supabase/tests/                   RLS tests (pgTAP [Verify])
types/database.ts                 generated by `supabase gen types typescript`
```

🆕 **As built (2026-09-30).** The Supabase CLI accepts only digit-only migration versions (`0002b` would be skipped), so files are named `20260930000100_extensions_and_schema` … `20260930000900_grants`, keeping the 06 §2 order: 0001 → `…0100`, 0002 → `…0200`, 0002b → `…0250`, 0003 → `…0300` … 0009 → `…0900`, plus `…1000_photo_bucket` (06 §10: private `photos`, JPEG only, 2 MB). SQL copied unchanged from 06. `0007` holds only the functions written in full SQL (06 §8.1, §8.1b); `0008` schedules only the three full jobs (overdue, escalation, hotspot risk). Still rule-only, to be written with their feature: 06 §8.2 functions, §8.3 read functions, and 4 jobs (missed pickups, routine collection, no-reply, performance flags). `seed.sql` holds organisations, areas, locations and disposal sites (fixed ids, re-runnable); users come from `scripts/seed-users.ts`; cases, pickups and trips are seeded with their modules.

## 8. Testing

Organisation isolation per role, functions-only writes, wrong-status errors, jobs run twice write once, rewards once, QR hidden — the 57 checks in 06 §11 — first in PGlite, then once on a local Supabase project.

## 9. Risks

| Risk | Mitigation |
|---|---|
| An access-rule mistake shows another organisation's data | RLS tests for every role of both organisations before each demo |
| Slow dashboards | Indexes + aggregate functions |
| Free project paused when inactive [Verify] | Open the app before the demo (08-DEVOPS checklist) |

## 10. Confirm at setup [Verify]

Postgres version on Supabase · pg_cron enabled · default table grants to `anon` / `authenticated` · pgTAP availability.

### Implementation checkpoint 🆕 (2026-10-01)

Two additive migrations implement the documented pickup transitions and the missed-pickup job: `20261001000100_pickup_functions.sql` and `20261001000200_missed_pickups.sql`. The job marks overdue requested/scheduled pickups missed using the organisation's local date and configured slot end, then creates one linked `missed_collection` report, timeline events and notifications. A unique index prevents duplicate linked reports. Both migrations passed the offline PGlite schema suite (16 tests), were the only pending migrations in a hosted dry run, and were applied to the configured Supabase database without rerunning seed data. Generated database types were refreshed. Other rule-only functions and jobs listed above remain outstanding.

🆕 A subsequent additive migration, `20261001000300_ai_quota.sql`, adds a user-visible quota read and a service-role-only, organisation-locked reservation for A1 calls. It passed the offline schema suite (17 schema tests), was the only pending hosted migration in a dry run, and was applied without seed. Generated types were refreshed again.

### Implementation checkpoint 🆕 (2026-10-01, case lifecycle and resident reads)

Additive migrations applied to the hosted database (dry run first, seed untouched): `20261001000500_staff_status.sql`, `20261001000600_case_lifecycle.sql` (`reject_report`, `correct_issue_type`, `return_report`, `close_report`, `reopen_report`, `follow_report`, `add_instruction`, `add_evidence`, `add_delay_note`, helper `private.is_open_case`; 06 §8.2 contracts) and `20261001000700_resident_reads.sql` (`get_leaderboard`, `get_next_collection`; 06 §8.3). All are revoked from `public` and `anon`. The offline suite now has 43 schema tests (19 earlier, 19 for the lifecycle functions, 5 for the resident reads), covering wrong role, wrong organisation, wrong status, missing reason and the reopen window. Hosted checks: logged-out users read nothing, cross-organisation reads return nothing, and the scheduled jobs wrote system events at :15 and :30. Still not implemented from 06 §8: `edit_report`, `cancel_report`, `set_waste_category`, trip functions (`start_trip`, `record_stop`, `record_disposal_scan`, `end_trip`, `get_vehicle_eta`), `get_dashboard_counts`, `get_scorecards`, `review_flag`, `get_job_health`, and the performance-monitoring job.

### Implementation checkpoint 🆕 (2026-10-01, staff list and live vehicles)

Applied after a dry run: `20261001000800_staff_verification.sql` (`users.staff_id`, `users.worker_type`, `staff_roster`, new sign-up trigger, `add_staff_id`, `remove_staff_id`), `20261001000900_vehicle_tracking.sql` (`vehicles.qr_code` hidden from clients, `vehicle_trips.last_lat/last_lng/last_accuracy_m/last_seen_at` — latest position only, one running trip per vehicle and driver, `start_trip`, `update_trip_position`, `end_trip`, `get_live_vehicles`, `get_vehicle_qr_sheet`) and `20261001001000_trip_audit.sql` (position-only updates are not written to `admin_audit_log`). 23 tables. Tests: `tests/schema/staff-and-trips.test.ts`.

### F14 SWMS bot quota 🆕 (2026-10-01)

`20261001001200_bot_runs.sql` extends `ai_runs.feature` with `chat` and adds `reserve_bot_run` for active users. The service-role-only function locks the user's organisation while enforcing the existing per-user and per-organisation daily AI limits, then records one call without a question, answer text, or private row contents. Session-scoped RLS reads supply only the resident's own or worker's assigned status summaries. Offline schema checks cover reservation, browser denial, deactivation and quota. This migration is local and has not been confirmed on the hosted database.
