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
