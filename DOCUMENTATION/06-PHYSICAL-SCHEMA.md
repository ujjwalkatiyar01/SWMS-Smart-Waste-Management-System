# Physical Schema — Waste Management System

| | |
|---|---|
| **Version** | v1.3 — 2026-09-30 (v1.1: team decisions D1–D3 · v1.2: expert re-audit S1–S3, F1–F3, I1–I6 · v1.3: research re-audit P1, R1–R7, see §13.1) |
| **Status** | **Final (stack approved 2026-09-30).** Written for the stack in [04-TECH-STACK.md](04-TECH-STACK.md) (Supabase Postgres + RLS). **Tested 2026-09-30** in PGlite (Postgres 17 in Node) with stand-ins for Supabase Auth and pg_cron: all SQL blocks load and 57 checks pass after both re-audits (§11.1–§11.3). Still run it once in a local Supabase project (§11), because PGlite is not Supabase. |
| **Builds on** | [03-FULL-APP-FLOW.md](03-FULL-APP-FLOW.md) §6 status diagrams, §7 permissions, §8 data model (22 tables after D1 and audit F3), §9 jobs · [05-AI-SPEC.md](05-AI-SPEC.md) A2–A8 · 04 §2.1 (G1–G9) and §5 security |
| **Evidence labels** | **[Doc]** = checked in official documentation · **[Rec]** = our recommendation · **[Verify]** = confirm while running it · **(demo)** = sample setting, not validated policy |

**Contents:** 1 Rules used in this schema · 2 Migration files · 3 Tables · 4 Indexes · 5 Helper functions · 6 Sign-up · 7 Access rules (RLS) · 8 Status-change functions · 9 Background jobs · 10 Photo storage · 11 How to test it · 12 Open decisions

---

## 1. Rules used in this schema

| Rule | How |
|---|---|
| One source of truth for names | Table and column names are exactly those in 03 §8. `*_url` columns hold the **storage path** (for example `org_id/reports/<id>/before.jpg`), never a public link. |
| Organisation isolation | Every table has `org_id` (in `organizations` the `id` is the organisation). Every access rule checks it first. [Rec] |
| RLS on every table | Enabled in the migration, because tables created in SQL do not get RLS automatically. [Doc] |
| **Writes to cases only through functions** | `reports`, `report_events`, `pickup_requests`, `trip_events`, `reward_events` and the flag tables have **no insert/update policies** for users. Every change goes through a status-change function that checks role, organisation, ownership and the allowed transition, writes the timeline event and notifications, all in one transaction. [Rec] |
| Setup tables | `areas`, `locations`, `vehicles`, `collection_schedules`, `vehicle_trips`, `trip_stops`, `prevention_reviews` and `organizations` settings are edited directly by admins, protected by access rules. |
| Status values | `text` + `check` constraints (easier to change during the build than Postgres enum types). [Rec] |
| Time | `timestamptz` (stored in UTC). "Today", slots and schedule windows are compared in the organisation's `timezone`. |
| Ids | `uuid` with `gen_random_uuid()`. `users.id` = the Supabase Auth user id. |
| Functions | `security definer` + `set search_path = ''` + fully qualified names, so a function cannot be tricked into using another table. [Rec] Helper and job functions live in a `private` schema that the API does not expose. [Rec] |
| Performance | Access rules call `(select auth.uid())` and helper functions inside `select`, so Postgres evaluates them once per query. [Doc] Columns used in rules are indexed (§4). |

---

## 2. Migration files (run in this order)

```
supabase/migrations/
  0001_extensions_and_schema.sql   private schema, pg_cron
  0002_tables.sql                  22 tables (§3)
  0002b_integrity.sql              🆕 same-organisation links, length limits, setting checks (§3.1)
  0003_indexes.sql                 §4
  0004_helpers.sql                 §5
  0005_signup.sql                  §6
  0006_rls.sql                     §7
  0007_status_functions.sql        §8
  0008_jobs.sql                    §9 functions + cron schedules
  0009_grants.sql                  §7.3
supabase/seed.sql                  demo data (times relative to now(), 04 G3)
```

### 0001 — extensions and schema

```sql
create schema if not exists private;
-- pg_cron: enable in Supabase Dashboard → Database → Extensions (or with SQL below). [Verify]
create extension if not exists pg_cron;
```

---

## 3. Tables (0002)

Tables are created in dependency order. 22 tables (21 = `pickup_events`, team decision D1; 22 = `admin_audit_log`, audit F3).

```sql
-- 1. organizations (all settings are demo values)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('ward','society','campus','public_place')),
  is_demo boolean not null default true,
  timezone text not null default 'Asia/Kolkata',
  deadline_hours_json jsonb not null default
    '{"overflowing_bin":12,"garbage_on_road":24,"missed_collection":12,"illegal_dumping":48,"improper_segregation":48,"other":48}',
  escalation_after_hours int not null default 12,
  escalation_level2_after_hours int not null default 24,
  reopen_window_days int not null default 3,
  no_reply_hours int not null default 24,
  recurrence_threshold int not null default 3,
  recurrence_window_days int not null default 30,
  daily_report_limit int not null default 10,
  max_open_pickups int not null default 2,
  far_from_site_m int not null default 100,
  segregation_policy text not null default 'collect_educate'
    check (segregation_policy in ('collect_educate','warn_escalate','refuse_allowed')),
  segregation_warn_threshold int not null default 3,
  segregation_warn_window_days int not null default 30,
  hazardous_deadline_hours int not null default 6,
  perf_sla_threshold_pct int not null default 70,
  perf_min_cases int not null default 5,
  perf_period_days int not null default 7,
  disposal_geofence_m int not null default 150,
  points_per_verified_report int not null default 10,
  ai_daily_limit_per_user int not null default 20,
  ai_daily_limit_per_org int not null default 200,
  signed_link_minutes int not null default 10,
  morning_slot_end time not null default '12:00',     -- D2 (demo)
  afternoon_slot_end time not null default '17:00',   -- D2 (demo)
  created_at timestamptz not null default now()
);

-- 2. areas
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

-- 3. users (profile; password lives only in Supabase Auth)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id),
  name text not null,
  email text not null,
  phone text,
  role text not null default 'resident'
    check (role in ('resident','worker','admin','supervisor','higher_authority')),
  area_id uuid references public.areas(id),
  active boolean not null default true,
  show_on_leaderboard boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. locations (bins, spots, disposal sites)
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  area_id uuid references public.areas(id),
  name text not null,
  kind text not null check (kind in ('bin','spot','disposal_site')),
  lat double precision,
  lng double precision,
  address text,
  qr_code text unique,             -- random token (04 G1), never the row id
  geofence_m int,                  -- disposal sites; null = organizations.disposal_geofence_m
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. vehicles
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  number text not null,
  kind text not null check (kind in ('truck','e-rickshaw','cart','other')),
  default_driver_id uuid references public.users(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. collection_schedules (routine collection per area)
create table public.collection_schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  area_id uuid not null references public.areas(id),
  days_of_week smallint[] not null,          -- 0 = Sunday … 6 = Saturday
  start_time time not null,                  -- organisation's local time
  end_time time not null,
  waste_type text not null check (waste_type in ('mixed','wet','dry')),
  vehicle_id uuid references public.vehicles(id),
  driver_id uuid references public.users(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- 7. vehicle_trips
create table public.vehicle_trips (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.users(id),
  trip_date date not null,
  status text not null default 'planned' check (status in ('planned','in_progress','completed')),
  started_at timestamptz,
  ended_at timestamptz,
  is_simulated boolean not null default true,
  schedule_id uuid references public.collection_schedules(id),
  disposal_site_id uuid references public.locations(id),
  disposal_check text not null default 'pending'
    check (disposal_check in ('verified','outside_geofence','no_scan','pending')),
  unapproved_stop_count int not null default 0,
  created_at timestamptz not null default now()
);

-- 8. pickup_requests
create table public.pickup_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  requester_id uuid not null references public.users(id),
  waste_type text not null check (waste_type in ('wet','dry','hazardous','bulky','e_waste')),
  preferred_date date not null,              -- holds the agreed date once scheduled (see §12 D2)
  slot text not null check (slot in ('morning','afternoon')),
  address text,
  lat double precision,
  lng double precision,
  note text,
  status text not null default 'requested'
    check (status in ('requested','scheduled','collected','cancelled','declined','missed','refused')),
  decline_reason text,
  refuse_reason text,
  assigned_worker_id uuid references public.users(id),
  photo_url text,
  segregation_ok boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. trip_stops
create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  trip_id uuid not null references public.vehicle_trips(id) on delete cascade,
  seq int not null,
  location_id uuid references public.locations(id),
  pickup_id uuid references public.pickup_requests(id),
  status text not null default 'pending' check (status in ('pending','collected','skipped','refused')),
  skip_reason text,
  segregation_ok boolean,
  created_at timestamptz not null default now(),
  unique (trip_id, seq),
  check (location_id is not null or pickup_id is not null)
);

-- 10. trip_events (append-only)
create table public.trip_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  trip_id uuid not null references public.vehicle_trips(id),
  stop_id uuid references public.trip_stops(id),
  driver_id uuid not null references public.users(id),
  type text not null
    check (type in ('start','arrived','collected','skipped','refused','disposal_scan','end')),
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  photo_url text,
  scan_method text check (scan_method in ('camera','typed')),
  created_at timestamptz not null default now()
);

-- 11. collection_runs
create table public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  schedule_id uuid not null references public.collection_schedules(id),
  run_date date not null,
  trip_id uuid references public.vehicle_trips(id),
  status text not null check (status in ('on_time','late','missed')),
  created_at timestamptz not null default now(),
  unique (schedule_id, run_date)
);

-- 12. reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  reporter_id uuid not null references public.users(id),
  location_id uuid references public.locations(id),
  issue_type text not null check (issue_type in
    ('overflowing_bin','garbage_on_road','missed_collection','illegal_dumping','improper_segregation','other')),
  note text,
  photo_url text,
  lat double precision,
  lng double precision,
  location_accuracy_m double precision,
  location_source text check (location_source in ('gps','registered','manual','qr','pickup')),
  device_lat double precision,              -- R1: raw phone GPS at submit; lat/lng = incident location after any pin correction
  device_lng double precision,
  location_corrected boolean not null default false,   -- R1: resident moved the pin
  location_mismatch boolean not null default false,    -- R1: phone GPS far from the chosen / scanned location (signal, not a block)
  is_new_incident boolean not null default true,       -- R6: false if a case was already open at this location
  attempt_count int not null default 0,                -- R3: completion attempts
  satisfaction text check (satisfaction in ('satisfied','neutral','unsatisfied')),  -- R2: optional, separate from resolved
  source text not null default 'resident' check (source in ('resident','missed_pickup')),
  source_pickup_id uuid references public.pickup_requests(id),
  status text not null default 'submitted' check (status in
    ('submitted','assigned','returned','awaiting_review','disputed','closed','reopened','cancelled','rejected')),
  assigned_worker_id uuid references public.users(id),
  due_at timestamptz not null,
  overdue_notified boolean not null default false,
  escalated boolean not null default false,
  escalation_level smallint not null default 0 check (escalation_level between 0 and 2),
  completion_photo_url text,
  completion_note text,
  completion_lat double precision,
  completion_lng double precision,
  far_from_site boolean not null default false,
  feedback text not null default 'none' check (feedback in ('resolved','partly','not_resolved','none')),
  feedback_comment text,
  close_reason text,
  closed_as_valid boolean,         -- D3: set when closed; true = counts for rewards
  reopen_count int not null default 0,
  closed_at timestamptz,
  schedule_id uuid references public.collection_schedules(id),
  waste_category text check (waste_category in ('wet','dry','biomedical','hazardous','e_waste','mixed_uncertain')),
  ai_category text check (ai_category in ('wet','dry','biomedical','hazardous','e_waste','mixed_uncertain')),
  ai_confidence text check (ai_confidence in ('high','medium','low')),
  ai_hazard boolean,
  ai_reason text,
  sla_met boolean,
  created_at timestamptz not null default now(),
  -- photo required, except the complaint auto-created from a missed pickup
  check (photo_url is not null or source = 'missed_pickup'),
  -- R7: a waste category is required ('mixed_uncertain' allowed), except the auto-created missed-pickup complaint
  check (waste_category is not null or source = 'missed_pickup'),
  check (source = 'resident' or source_pickup_id is not null)
);

-- 13. report_events (append-only timeline = audit log)
create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  report_id uuid not null references public.reports(id),
  actor_id uuid references public.users(id),     -- null = system (jobs)
  type text not null,   -- created, edited, cancelled, rejected, assigned, type_changed, category_changed,
                        -- completed, returned, feedback, closed, disputed, reopened, overdue,
                        -- escalated, escalated_l2, instruction, no_reply
  note text,
  photo_url text,
  data jsonb,           -- R3/R5: structured details, e.g. {"feedback":"partly","satisfaction":"neutral","attempt":2}
  created_at timestamptz not null default now()
);

-- 14. report_followers
create table public.report_followers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  report_id uuid not null references public.reports(id),
  user_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- 15. prevention_reviews
create table public.prevention_reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  location_id uuid not null references public.locations(id),
  created_by uuid not null references public.users(id),
  suspected_cause text,
  action text,
  owner_name text,
  review_date date,
  status text not null default 'open' check (status in ('open','done')),
  outcome_note text,
  created_at timestamptz not null default now()
);

-- 16. notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  user_id uuid not null references public.users(id),
  type text not null,
  record_type text,          -- report | pickup | trip | flag | reward
  record_id uuid,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- 17. ai_runs
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  user_id uuid not null references public.users(id),
  feature text not null default 'classify_photo' check (feature in ('classify_photo')),
  record_type text,          -- 'report', or null for the "Which bin?" helper
  record_id uuid,
  provider text,
  model text,
  output_json jsonb,
  category text,
  confidence text,
  error text,
  latency_ms int,
  created_at timestamptz not null default now()
);

-- 18. location_risk
create table public.location_risk (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  location_id uuid not null references public.locations(id),
  score int not null check (score between 0 and 100),
  factors_json jsonb not null,
  computed_for_date date not null,
  created_at timestamptz not null default now(),
  unique (location_id, computed_for_date)
);

-- 19. performance_flags
create table public.performance_flags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  subject_type text not null check (subject_type in ('worker','admin','area')),
  subject_id uuid not null,
  metric text not null,
  value numeric not null,
  threshold numeric not null,
  period_start date not null,
  period_end date not null,
  raised_to_role text not null check (raised_to_role in ('admin','supervisor','higher_authority')),
  status text not null default 'open' check (status in ('open','reviewed')),
  outcome text,
  outcome_note text,
  created_at timestamptz not null default now(),
  unique (subject_type, subject_id, metric, period_end)
);

-- 20. reward_events (append-only ledger; badges computed from it)
create table public.reward_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  user_id uuid not null references public.users(id),
  report_id uuid not null references public.reports(id),
  points int not null,
  reason text not null check (reason in ('verified_report','category_kept','hazard_correct')),
  created_at timestamptz not null default now(),
  unique (report_id, reason)       -- no double points (04 G9)
);

-- 21. pickup_events (append-only pickup timeline, team decision D1)
create table public.pickup_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  pickup_id uuid not null references public.pickup_requests(id),
  actor_id uuid references public.users(id),     -- null = system (jobs)
  type text not null,   -- created, edited, cancelled, scheduled, rescheduled, declined,
                        -- collected, refused, missed, not_segregated, segregation_warning
  old_date date,        -- reschedule: previous date and slot (D4)
  old_slot text,
  note text,
  created_at timestamptz not null default now()
);

-- 22. admin_audit_log (append-only history of setup changes, audit F3; written only by triggers)
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  actor_id uuid references public.users(id),     -- null = server / seed script
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  old_json jsonb,
  new_json jsonb,
  created_at timestamptz not null default now()
);
```

**Cross-organisation links** (for example a report pointing at a location of another organisation) are blocked inside the status-change functions and by admin access rules, not by foreign keys. [Rec] **Audit I1 🆕:** testing showed an admin could still link a location to another organisation's area, so §3.1 adds links that also check the organisation.

### 3.1 Integrity rules added after the expert re-audit 🆕 (0002b)

```sql
-- I1: every link must stay inside the same organisation (composite keys)
alter table public.areas                add unique (id, org_id);
alter table public.users                add unique (id, org_id);
alter table public.locations            add unique (id, org_id);
alter table public.vehicles             add unique (id, org_id);
alter table public.collection_schedules add unique (id, org_id);
alter table public.vehicle_trips        add unique (id, org_id);
alter table public.pickup_requests      add unique (id, org_id);
alter table public.reports              add unique (id, org_id);

alter table public.users     add foreign key (area_id, org_id) references public.areas (id, org_id);
alter table public.locations add foreign key (area_id, org_id) references public.areas (id, org_id);
alter table public.vehicles  add foreign key (default_driver_id, org_id) references public.users (id, org_id);
alter table public.collection_schedules
  add foreign key (area_id, org_id)   references public.areas (id, org_id),
  add foreign key (vehicle_id, org_id) references public.vehicles (id, org_id),
  add foreign key (driver_id, org_id)  references public.users (id, org_id);
alter table public.vehicle_trips
  add foreign key (vehicle_id, org_id)       references public.vehicles (id, org_id),
  add foreign key (driver_id, org_id)        references public.users (id, org_id),
  add foreign key (schedule_id, org_id)      references public.collection_schedules (id, org_id),
  add foreign key (disposal_site_id, org_id) references public.locations (id, org_id);
alter table public.trip_stops
  add foreign key (trip_id, org_id)     references public.vehicle_trips (id, org_id),
  add foreign key (location_id, org_id) references public.locations (id, org_id),
  add foreign key (pickup_id, org_id)   references public.pickup_requests (id, org_id);
alter table public.reports
  add foreign key (location_id, org_id)        references public.locations (id, org_id),
  add foreign key (assigned_worker_id, org_id) references public.users (id, org_id),
  add foreign key (schedule_id, org_id)        references public.collection_schedules (id, org_id),
  add foreign key (source_pickup_id, org_id)   references public.pickup_requests (id, org_id);
alter table public.pickup_requests add foreign key (assigned_worker_id, org_id) references public.users (id, org_id);
alter table public.prevention_reviews add foreign key (location_id, org_id) references public.locations (id, org_id);

-- S3: length limits in the database (functions can be called directly, not only through our server)
alter table public.users              add check (length(name) <= 100), add check (length(phone) <= 20);
alter table public.areas              add check (length(name) <= 100);
alter table public.locations          add check (length(name) <= 100), add check (length(address) <= 300);
alter table public.reports            add check (length(note) <= 1000), add check (length(feedback_comment) <= 1000),
                                      add check (length(completion_note) <= 1000), add check (length(close_reason) <= 500);
alter table public.report_events      add check (length(note) <= 1000);
alter table public.pickup_requests    add check (length(note) <= 1000), add check (length(address) <= 300),
                                      add check (length(decline_reason) <= 500), add check (length(refuse_reason) <= 500);
alter table public.pickup_events      add check (length(note) <= 1000);
alter table public.prevention_reviews add check (length(suspected_cause) <= 1000), add check (length(action) <= 1000),
                                      add check (length(outcome_note) <= 1000);
alter table public.notifications      add check (length(message) <= 300);

-- I2: settings must make sense
alter table public.organizations add check (
  escalation_after_hours > 0 and escalation_level2_after_hours > escalation_after_hours
  and reopen_window_days between 1 and 30 and no_reply_hours > 0
  and recurrence_threshold > 0 and recurrence_window_days > 0
  and daily_report_limit between 1 and 100 and max_open_pickups between 1 and 20
  and far_from_site_m between 10 and 5000 and disposal_geofence_m between 10 and 5000
  and hazardous_deadline_hours > 0 and perf_sla_threshold_pct between 1 and 100
  and perf_min_cases > 0 and perf_period_days > 0 and points_per_verified_report >= 0
  and ai_daily_limit_per_user >= 0 and ai_daily_limit_per_org >= 0
  and signed_link_minutes between 1 and 60 and afternoon_slot_end > morning_slot_end
  and segregation_warn_threshold > 0 and segregation_warn_window_days > 0);

-- I5: keep pickup_requests.updated_at current
create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger pickup_touch before update on public.pickup_requests
  for each row execute function private.touch_updated_at();
```

---

## 4. Indexes (0003)

```sql
create index on public.users (org_id, role);
create index on public.locations (org_id, area_id);
create index on public.reports (org_id, status);
create index on public.reports (location_id, created_at);
create index on public.reports (assigned_worker_id, status);
create index on public.reports (reporter_id, created_at);
create index on public.reports (due_at) where status in ('submitted','assigned','returned','disputed','reopened');
create index on public.report_events (report_id, created_at);
create index on public.report_followers (user_id);
create index on public.pickup_requests (org_id, status);
create index on public.pickup_requests (requester_id, status);
create index on public.pickup_requests (assigned_worker_id, status);
create index on public.vehicle_trips (driver_id, trip_date);
create index on public.trip_stops (trip_id);
create index on public.trip_events (trip_id, created_at);
create index on public.notifications (user_id, read_at);
create index on public.ai_runs (user_id, created_at);
create index on public.ai_runs (org_id, created_at);
create index on public.reward_events (user_id);
create index on public.pickup_events (pickup_id, created_at);
create index on public.admin_audit_log (org_id, created_at);
```

---

## 5. Helper functions (0004)

```sql
-- Who is calling (null if not logged in or deactivated → every access rule fails)
create or replace function private.my_org() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.org_id from public.users u where u.id = (select auth.uid()) and u.active
$$;

create or replace function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select u.role from public.users u where u.id = (select auth.uid()) and u.active
$$;

-- Distance in metres between two GPS points (haversine, 04 G2)
create or replace function private.distance_m(
  lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision
) returns double precision
language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Due time: type deadline, or the hazardous deadline if shorter (05 A2)
create or replace function private.due_at_for(
  p_org uuid, p_issue_type text, p_waste_category text, p_from timestamptz
) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select p_from + make_interval(hours =>
    case when p_waste_category in ('biomedical','hazardous')
         then least((o.deadline_hours_json ->> p_issue_type)::int, o.hazardous_deadline_hours)
         else (o.deadline_hours_json ->> p_issue_type)::int end)
  from public.organizations o where o.id = p_org
$$;

-- Timeline event
create or replace function private.log_event(
  p_org uuid, p_report uuid, p_actor uuid, p_type text, p_note text default null, p_photo text default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.report_events (org_id, report_id, actor_id, type, note, photo_url)
  values (p_org, p_report, p_actor, p_type, p_note, p_photo)
$$;

-- Notify one user
create or replace function private.notify(
  p_org uuid, p_user uuid, p_type text, p_record_type text, p_record uuid, p_message text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  select p_org, p_user, p_type, p_record_type, p_record, p_message where p_user is not null
$$;

-- Notify every active user of a role in the organisation
create or replace function private.notify_role(
  p_org uuid, p_role text, p_type text, p_record_type text, p_record uuid, p_message text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  select p_org, u.id, p_type, p_record_type, p_record, p_message
  from public.users u where u.org_id = p_org and u.role = p_role and u.active
$$;

-- F3 🆕: history of setup changes (who changed what, old and new values)
create or replace function private.audit_setup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.admin_audit_log (org_id, actor_id, table_name, record_id, action, old_json, new_json)
  values (coalesce((v_row ->> 'org_id')::uuid, (v_row ->> 'id')::uuid),   -- organizations: id is the org
          (select auth.uid()), tg_table_name, (v_row ->> 'id')::uuid, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_organizations after update on public.organizations
  for each row execute function private.audit_setup();
create trigger audit_areas after insert or update or delete on public.areas
  for each row execute function private.audit_setup();
create trigger audit_locations after insert or update or delete on public.locations
  for each row execute function private.audit_setup();
create trigger audit_vehicles after insert or update or delete on public.vehicles
  for each row execute function private.audit_setup();
create trigger audit_schedules after insert or update or delete on public.collection_schedules
  for each row execute function private.audit_setup();
create trigger audit_users after update of role, active, area_id on public.users
  for each row execute function private.audit_setup();
create trigger audit_trips after insert or update or delete on public.vehicle_trips
  for each row execute function private.audit_setup();
create trigger audit_reviews after insert or update or delete on public.prevention_reviews
  for each row execute function private.audit_setup();

-- F2 🆕: same visibility as the reports_read rule, for functions that bypass RLS
create or replace function private.can_read_report(p_report uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report and r.org_id = private.my_org() and (
      r.reporter_id = (select auth.uid()) or r.assigned_worker_id = (select auth.uid())
      or private.my_role() in ('admin','supervisor')
      or (private.my_role() = 'higher_authority' and r.escalation_level = 2)
      or exists (select 1 from public.report_followers f
                 where f.report_id = r.id and f.user_id = (select auth.uid()))))
$$;

-- P1: who may see full case details (photos, notes, feedback, names)
create or replace function private.can_see_details(p_report uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report and r.org_id = private.my_org() and (
      r.reporter_id = (select auth.uid()) or r.assigned_worker_id = (select auth.uid())
      or private.my_role() in ('admin','supervisor')))
$$;

-- Notify reporter + followers of a case
create or replace function private.notify_case(
  p_report uuid, p_type text, p_message text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  select r.org_id, r.reporter_id, p_type, 'report', r.id, p_message from public.reports r where r.id = p_report
  union
  select f.org_id, f.user_id, p_type, 'report', f.report_id, p_message from public.report_followers f where f.report_id = p_report
$$;
```

---

## 6. Sign-up (0005)

Residents sign up themselves; the profile row is created by a trigger and the role is **always** `resident`. Staff are created by the server (admin setup, F2.3) with the service-role key, which then sets the role. [Rec]

```sql
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := (new.raw_user_meta_data ->> 'org_id')::uuid;
  v_area uuid := nullif(new.raw_user_meta_data ->> 'area_id', '')::uuid;
begin
  if not exists (select 1 from public.organizations o where o.id = v_org) then
    raise exception 'Unknown organisation';
  end if;
  if v_area is not null and not exists
     (select 1 from public.areas a where a.id = v_area and a.org_id = v_org and a.active) then
    raise exception 'Area does not belong to this organisation';
  end if;
  insert into public.users (id, org_id, name, email, phone, area_id, role)
  values (new.id, v_org, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
          new.raw_user_meta_data ->> 'phone', v_area, 'resident');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- The sign-up page needs organisation and area names before login (names only, no settings)
create or replace function public.list_orgs_for_signup()
returns table (id uuid, name text, type text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.type from public.organizations o order by o.name
$$;

create or replace function public.list_areas_for_signup(p_org uuid)
returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.name from public.areas a where a.org_id = p_org and a.active order by a.name
$$;
```

---

## 7. Access rules — RLS (0006)

### 7.1 Who can read what

| Table | Read | Direct write |
|---|---|---|
| organizations | own organisation | admin updates settings |
| areas, vehicles, collection_schedules | own organisation | admin — insert and update only; deactivate instead of delete (I3) |
| locations | own organisation, **without `qr_code`** (column grant, 7.3) | admin — insert and update only (I3) |
| users | self; admin, supervisor, higher authority: own organisation | self: name, phone, area, leaderboard choice (7.3); admin changes through functions |
| reports | reporter, assigned worker; admin and supervisor: organisation. **Followers and higher authority: limited summaries only** (no photos, notes or feedback) through functions (P1) | **functions only** |
| report_events | whoever can read the report | functions only |
| report_followers | own rows | functions only |
| pickup_requests | requester, assigned worker; admin, supervisor: organisation | functions only |
| vehicle_trips, trip_stops | driver of the trip; admin, supervisor: organisation | admin plans (status `planned`); taps through functions |
| trip_events | whoever can read the trip | functions only |
| pickup_events | whoever can read the pickup | functions only |
| admin_audit_log 🆕 | admin, supervisor: organisation | triggers only (F3) |
| collection_runs, location_risk | admin, supervisor, higher authority | jobs only |
| prevention_reviews | admin, supervisor | admin |
| notifications | own | own `read_at` only |
| ai_runs | own runs; admin: organisation | **server only, with the service-role key** (audit S1: users could forge AI results) |
| performance_flags | admin: worker flags · supervisor: all · higher authority: admin and area flags | functions only |
| reward_events | own | functions only |

Anything the table does not allow (for example the resident leaderboard or higher-authority scorecards) is served by read-only functions that return only safe fields (§8.3).

### 7.2 Policies

```sql
alter table public.organizations       enable row level security;
alter table public.areas               enable row level security;
alter table public.users               enable row level security;
alter table public.locations           enable row level security;
alter table public.vehicles            enable row level security;
alter table public.collection_schedules enable row level security;
alter table public.vehicle_trips       enable row level security;
alter table public.pickup_requests     enable row level security;
alter table public.trip_stops          enable row level security;
alter table public.trip_events         enable row level security;
alter table public.collection_runs     enable row level security;
alter table public.reports             enable row level security;
alter table public.report_events       enable row level security;
alter table public.report_followers    enable row level security;
alter table public.prevention_reviews  enable row level security;
alter table public.notifications       enable row level security;
alter table public.ai_runs             enable row level security;
alter table public.location_risk       enable row level security;
alter table public.performance_flags   enable row level security;
alter table public.reward_events       enable row level security;
alter table public.pickup_events       enable row level security;
alter table public.admin_audit_log     enable row level security;

-- organizations
create policy org_read on public.organizations for select to authenticated
  using (id = (select private.my_org()));
create policy org_admin_update on public.organizations for update to authenticated
  using (id = (select private.my_org()) and (select private.my_role()) = 'admin')
  with check (id = (select private.my_org()));

-- setup tables: read by organisation, written by admin
create policy areas_read on public.areas for select to authenticated
  using (org_id = (select private.my_org()));
create policy areas_admin on public.areas for all to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin')
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');

create policy locations_read on public.locations for select to authenticated
  using (org_id = (select private.my_org()));
create policy locations_admin on public.locations for all to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin')
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');

create policy vehicles_read on public.vehicles for select to authenticated
  using (org_id = (select private.my_org()));
create policy vehicles_admin on public.vehicles for all to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin')
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');

create policy schedules_read on public.collection_schedules for select to authenticated
  using (org_id = (select private.my_org()));
create policy schedules_admin on public.collection_schedules for all to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin')
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');

-- users
create policy users_read on public.users for select to authenticated
  using (id = (select auth.uid())
         or (org_id = (select private.my_org())
             and (select private.my_role()) in ('admin','supervisor','higher_authority')));
create policy users_self_update on public.users for update to authenticated
  using (id = (select auth.uid()) and active)
  with check (id = (select auth.uid()));

-- reports
-- P1 (research re-audit): full case rows — photos, notes, feedback — only for reporter, assigned worker,
-- admin and supervisor (PRD team decision). Followers and the higher authority read limited summaries
-- through followed_cases(), authority_cases() and case_summary() (§8.1c). Tested: in v1.2 a follower
-- could read the reporter's private feedback comment.
create policy reports_read on public.reports for select to authenticated
  using (org_id = (select private.my_org()) and (
    reporter_id = (select auth.uid())
    or assigned_worker_id = (select auth.uid())
    or (select private.my_role()) in ('admin','supervisor')
  ));

create policy report_events_read on public.report_events for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_events.report_id));

create policy followers_read on public.report_followers for select to authenticated
  using (user_id = (select auth.uid()));

-- pickups
create policy pickups_read on public.pickup_requests for select to authenticated
  using (org_id = (select private.my_org()) and (
    requester_id = (select auth.uid())
    or assigned_worker_id = (select auth.uid())
    or (select private.my_role()) in ('admin','supervisor')));

create policy pickup_events_read on public.pickup_events for select to authenticated
  using (exists (select 1 from public.pickup_requests p where p.id = pickup_events.pickup_id));

-- trips
create policy trips_read on public.vehicle_trips for select to authenticated
  using (org_id = (select private.my_org()) and (
    driver_id = (select auth.uid()) or (select private.my_role()) in ('admin','supervisor')));
create policy trips_admin_plan on public.vehicle_trips for insert to authenticated
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin'
              and status = 'planned');
create policy trips_admin_edit_planned on public.vehicle_trips for update to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin' and status = 'planned')
  with check (org_id = (select private.my_org()) and status = 'planned');

create policy stops_read on public.trip_stops for select to authenticated
  using (exists (select 1 from public.vehicle_trips t where t.id = trip_stops.trip_id));
create policy stops_admin_plan on public.trip_stops for all to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin'
         and exists (select 1 from public.vehicle_trips t where t.id = trip_stops.trip_id and t.status = 'planned'))
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');

create policy trip_events_read on public.trip_events for select to authenticated
  using (exists (select 1 from public.vehicle_trips t where t.id = trip_events.trip_id));

-- job outputs
create policy runs_read on public.collection_runs for select to authenticated
  using (org_id = (select private.my_org())
         and (select private.my_role()) in ('admin','supervisor','higher_authority'));
create policy risk_read on public.location_risk for select to authenticated
  using (org_id = (select private.my_org())
         and (select private.my_role()) in ('admin','supervisor','higher_authority'));

-- prevention reviews
create policy reviews_read on public.prevention_reviews for select to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('admin','supervisor'));
create policy reviews_admin on public.prevention_reviews for all to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin')
  with check (org_id = (select private.my_org()) and (select private.my_role()) = 'admin'
              and created_by = (select auth.uid()));

-- notifications
create policy notif_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notif_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- AI runs
create policy ai_runs_admin_read on public.ai_runs for select to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) = 'admin');
-- Audit S1 🆕: no insert rule for users. The server writes ai_runs with the service-role key after
-- calling the AI itself, so a user cannot invent an AI result (hazard deadline, bonus points).
-- (v1.1 had an 'ai_runs_insert_own' rule here; removed after testing proved it allowed forged results.)
create policy ai_runs_read_own on public.ai_runs for select to authenticated
  using (user_id = (select auth.uid()));

-- performance flags (routing from 05 A4)
create policy flags_read on public.performance_flags for select to authenticated
  using (org_id = (select private.my_org()) and (
    ((select private.my_role()) = 'admin' and subject_type = 'worker')
    or (select private.my_role()) = 'supervisor'
    or ((select private.my_role()) = 'higher_authority' and subject_type in ('admin','area'))));

-- setup history (F3)
create policy audit_read on public.admin_audit_log for select to authenticated
  using (org_id = (select private.my_org()) and (select private.my_role()) in ('admin','supervisor'));

-- rewards
create policy rewards_read_own on public.reward_events for select to authenticated
  using (user_id = (select auth.uid()));
```

### 7.3 Grants (0009)

Supabase gives the `anon` and `authenticated` roles broad table privileges by default; access rules then decide rows. We also narrow the privileges so that "functions only" tables cannot be written even if a policy is added by mistake. [Rec] [Verify default grants in the project]

```sql
-- Nobody logged out reads tables
revoke all on all tables in schema public from anon;

-- Case tables: read only; writes go through functions
revoke insert, update, delete on public.reports, public.report_events, public.report_followers,
  public.pickup_requests, public.trip_events, public.collection_runs, public.location_risk,
  public.performance_flags, public.reward_events, public.pickup_events,
  public.ai_runs, public.admin_audit_log from authenticated;                 -- S1, F3

-- I3: setup records are deactivated, never deleted (old reports keep their links)
revoke delete on public.organizations, public.areas, public.locations, public.vehicles,
  public.collection_schedules, public.prevention_reviews, public.users from authenticated;

-- QR tokens are not readable by clients (admin prints them through get_qr_sheet, §8.3)
revoke select on public.locations from authenticated;
grant select (id, org_id, area_id, name, kind, lat, lng, address, geofence_m, active, created_at)
  on public.locations to authenticated;

-- Users may change only these columns of their own profile
revoke update on public.users from authenticated;
grant update (name, phone, area_id, show_on_leaderboard) on public.users to authenticated;

-- Notifications: only mark as read
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- Functions
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.my_org(), private.my_role(),
  private.distance_m(double precision, double precision, double precision, double precision)
  to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.list_orgs_for_signup(), public.list_areas_for_signup(uuid) to anon;
```

---

## 8. Status-change functions (0007)

Every function: (1) finds the caller and stops with *Not allowed* if not logged in, inactive, wrong role or wrong organisation; (2) locks the row (`for update`); (3) checks the allowed transition from 03 §6; (4) updates; (5) writes the timeline event; (6) writes notifications (03 F11). All in one transaction — if any step fails, nothing is saved.

### 8.1 Full SQL for the core case

```sql
-- F3: create a report (photo already uploaded by the server to p_photo_url)
create or replace function public.create_report(
  p_id uuid, p_issue_type text, p_photo_url text, p_note text,
  p_location_id uuid, p_lat double precision, p_lng double precision, p_accuracy_m double precision,
  p_location_source text, p_waste_category text, p_ai_run_id uuid default null, p_schedule_id uuid default null,
  p_device_lat double precision default null, p_device_lng double precision default null,   -- R1
  p_location_corrected boolean default false                                                -- R1
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_org public.organizations;
  v_ai public.ai_runs;
  v_today int;
  v_loc public.locations;
  v_mismatch boolean := false;
  v_new boolean := true;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  if v_me.id is null or v_me.role not in ('resident','admin') then raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_me.org_id;

  select count(*) into v_today from public.reports r
  where r.reporter_id = v_me.id
    and (r.created_at at time zone v_org.timezone)::date = (now() at time zone v_org.timezone)::date;
  if v_today >= v_org.daily_report_limit then raise exception 'Daily report limit reached'; end if;
  -- S2 🆕: the photo must be in this organisation's folder for this report
  if p_photo_url is null or p_photo_url not like v_me.org_id::text || '/reports/' || p_id::text || '/%' then
    raise exception 'Invalid photo';
  end if;

  if p_waste_category is null then raise exception 'Choose a waste category'; end if;   -- R7

  if p_location_id is not null then
    select * into v_loc from public.locations l
    where l.id = p_location_id and l.org_id = v_me.org_id and l.active and l.kind in ('bin','spot');
    if v_loc.id is null then raise exception 'Not allowed'; end if;
    -- R1: phone far from the chosen / scanned bin → flag for review (QR can be copied or the bin moved)
    if p_device_lat is not null and v_loc.lat is not null then
      v_mismatch := private.distance_m(p_device_lat, p_device_lng, v_loc.lat, v_loc.lng) > v_org.far_from_site_m;
    end if;
    -- R6: a report at a place that already has an open case is not a new incident
    v_new := not exists (select 1 from public.reports r where r.location_id = p_location_id
             and r.status in ('submitted','assigned','returned','awaiting_review','disputed','reopened'));
  end if;
  if p_schedule_id is not null and not exists (select 1 from public.collection_schedules s
     where s.id = p_schedule_id and s.org_id = v_me.org_id) then
    raise exception 'Not allowed';
  end if;
  if p_ai_run_id is not null then
    select * into v_ai from public.ai_runs a where a.id = p_ai_run_id and a.user_id = v_me.id;
  end if;

  insert into public.reports (id, org_id, reporter_id, location_id, issue_type, note, photo_url,
    lat, lng, location_accuracy_m, location_source, device_lat, device_lng, location_corrected,
    location_mismatch, is_new_incident, source, status, due_at, schedule_id,
    waste_category, ai_category, ai_confidence, ai_hazard, ai_reason)
  values (p_id, v_me.org_id, v_me.id, p_location_id, p_issue_type, p_note, p_photo_url,
    p_lat, p_lng, p_accuracy_m, p_location_source, p_device_lat, p_device_lng, coalesce(p_location_corrected, false),
    v_mismatch, v_new, 'resident', 'submitted',
    private.due_at_for(v_me.org_id, p_issue_type, p_waste_category, now()), p_schedule_id,
    p_waste_category, v_ai.category, v_ai.confidence,
    (v_ai.output_json ->> 'hazard')::boolean, v_ai.output_json ->> 'reason');

  if v_ai.id is not null then
    update public.ai_runs set record_type = 'report', record_id = p_id where id = v_ai.id;
  end if;

  perform private.log_event(v_me.org_id, p_id, v_me.id, 'created');
  perform private.notify_role(v_me.org_id, 'admin', 'new_report', 'report', p_id, 'New report submitted');
  return p_id;
end $$;

-- F4.1 / F4.7 / F5.3: assign or reassign (admin, supervisor)
create or replace function public.assign_report(p_report uuid, p_worker uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.org_id <> v_me.org_id
     or v_me.role not in ('admin','supervisor') then raise exception 'Not allowed'; end if;
  if v_r.status not in ('submitted','assigned','returned','disputed','reopened') then
    raise exception 'This case cannot be assigned in its current status';
  end if;
  if not exists (select 1 from public.users w where w.id = p_worker and w.org_id = v_me.org_id
                 and w.role = 'worker' and w.active) then raise exception 'Worker not available'; end if;

  update public.reports set status = 'assigned', assigned_worker_id = p_worker where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'assigned');
  perform private.notify(v_r.org_id, p_worker, 'assigned', 'report', p_report, 'New task assigned to you');
  perform private.notify_case(p_report, 'assigned', 'A worker has been assigned to your case');
end $$;

-- F4.4: worker completes with after-photo and GPS; far-from-site is a warning, not a block
create or replace function public.complete_report(
  p_report uuid, p_photo_url text, p_note text, p_lat double precision, p_lng double precision
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_r public.reports;
  v_org public.organizations;
  v_lat double precision;
  v_lng double precision;
  v_far boolean := false;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_r from public.reports where id = p_report for update;
  if v_me.id is null or v_r.id is null or v_r.assigned_worker_id <> v_me.id or v_r.status <> 'assigned' then
    raise exception 'Not allowed';
  end if;
  if p_photo_url is null then raise exception 'After-photo is required'; end if;
  -- S2 🆕: after-photo must be in this report's folder
  if p_photo_url not like v_r.org_id::text || '/reports/' || p_report::text || '/%' then
    raise exception 'Invalid photo';
  end if;
  select * into v_org from public.organizations where id = v_r.org_id;

  v_lat := coalesce(v_r.lat, (select l.lat from public.locations l where l.id = v_r.location_id));
  v_lng := coalesce(v_r.lng, (select l.lng from public.locations l where l.id = v_r.location_id));
  if v_lat is not null and p_lat is not null then
    v_far := private.distance_m(v_lat, v_lng, p_lat, p_lng) > v_org.far_from_site_m;
  end if;

  update public.reports set status = 'awaiting_review', completion_photo_url = p_photo_url,
    completion_note = p_note, completion_lat = p_lat, completion_lng = p_lng, far_from_site = v_far,
    attempt_count = attempt_count + 1                                              -- R3
  where id = p_report;
  perform private.log_event(v_r.org_id, p_report, v_me.id, 'completed', p_note, p_photo_url);
  perform private.notify_case(p_report, 'completed', 'Work done — please check the before/after photos');
  if v_far then
    perform private.notify_role(v_r.org_id, 'admin', 'far_from_site', 'report', p_report,
      'Completion GPS is far from the report location');
  end if;
end $$;

-- Rewards (05 A8): only for resident reports that close as verified; each reason once
create or replace function private.award_points(p_report uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.reports;
  v_pts int;
begin
  select * into v_r from public.reports where id = p_report;
  if v_r.source <> 'resident' then return; end if;
  select o.points_per_verified_report into v_pts from public.organizations o where o.id = v_r.org_id;

  insert into public.reward_events (org_id, user_id, report_id, points, reason)
  values (v_r.org_id, v_r.reporter_id, v_r.id, v_pts, 'verified_report')
  on conflict (report_id, reason) do nothing;

  if v_r.ai_category is not null and v_r.ai_category <> 'mixed_uncertain'
     and v_r.waste_category = v_r.ai_category then
    insert into public.reward_events (org_id, user_id, report_id, points, reason)
    values (v_r.org_id, v_r.reporter_id, v_r.id, 5, 'category_kept')
    on conflict (report_id, reason) do nothing;
  end if;

  if v_r.ai_hazard and v_r.waste_category in ('biomedical','hazardous') then
    insert into public.reward_events (org_id, user_id, report_id, points, reason)
    values (v_r.org_id, v_r.reporter_id, v_r.id, 5, 'hazard_correct')
    on conflict (report_id, reason) do nothing;
  end if;
end $$;

-- F4.6: reporter feedback
create or replace function public.submit_feedback(p_report uuid, p_feedback text, p_comment text,
  p_satisfaction text default null)                                                -- R2
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_r public.reports;
begin
  select * into v_r from public.reports where id = p_report for update;
  if v_r.id is null or v_r.reporter_id <> (select auth.uid()) or v_r.status <> 'awaiting_review'
     or private.my_org() is null then raise exception 'Not allowed'; end if;
  if p_feedback not in ('resolved','partly','not_resolved') then raise exception 'Invalid feedback'; end if;
  -- R3: the answer is tied to this completion attempt and kept on the timeline
  insert into public.report_events (org_id, report_id, actor_id, type, note, data)
  values (v_r.org_id, p_report, v_r.reporter_id, 'feedback', p_comment,
          jsonb_build_object('feedback', p_feedback, 'satisfaction', p_satisfaction, 'attempt', v_r.attempt_count));

  if p_feedback = 'resolved' then
    update public.reports set status = 'closed', feedback = p_feedback, feedback_comment = p_comment,
      satisfaction = p_satisfaction,
      closed_at = now(), sla_met = (now() <= due_at), closed_as_valid = true where id = p_report;
    perform private.log_event(v_r.org_id, p_report, v_r.reporter_id, 'closed', p_comment);
    perform private.award_points(p_report);
  else
    update public.reports set status = 'disputed', feedback = p_feedback, feedback_comment = p_comment,
      satisfaction = p_satisfaction
    where id = p_report;
    perform private.log_event(v_r.org_id, p_report, v_r.reporter_id, 'disputed', p_comment);
    perform private.notify_role(v_r.org_id, 'admin', 'disputed', 'report', p_report,
      'Resident says the problem is not fully resolved');
  end if;
end $$;
```

### 8.1b Read functions added after the re-audits 🆕 (F1, F2, P1)

```sql
-- F1: duplicate warning (03 F3.3b). Residents cannot read other people's reports, so this returns
-- only "is there an open case here" — no names, notes or photos.
create or replace function public.open_case_at(p_location uuid)
returns table (report_id uuid, issue_type text, status text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.issue_type, r.status, r.created_at
  from public.reports r
  where r.location_id = p_location and r.org_id = private.my_org()
    and r.status in ('submitted','assigned','returned','awaiting_review','disputed','reopened')
  order by r.created_at desc
  limit 3
$$;

-- F2: first names of the people on a case (dashboard "owner", 03 F8), only for someone who can read the case
create or replace function public.case_people(p_report uuid)
returns table (reporter_first_name text, worker_first_name text)
language sql stable security definer set search_path = '' as $$
  select split_part(rp.name, ' ', 1), split_part(w.name, ' ', 1)
  from public.reports r
  join public.users rp on rp.id = r.reporter_id
  left join public.users w on w.id = r.assigned_worker_id
  where r.id = p_report and private.can_see_details(p_report)     -- P1: not followers / higher authority
$$;

-- P1: limited views for followers and the higher authority (status and facts, no photos, notes or feedback)
create or replace function public.case_summary(p_report uuid)
returns table (report_id uuid, issue_type text, location_name text, area_name text, status text,
               created_at timestamptz, due_at timestamptz, overdue boolean, escalation_level smallint,
               event_types jsonb)
language sql stable security definer set search_path = '' as $$
  select r.id, r.issue_type, l.name, a.name, r.status, r.created_at, r.due_at,
         (r.overdue_notified and r.status in ('submitted','assigned','returned','disputed','reopened')),
         r.escalation_level,
         (select jsonb_agg(jsonb_build_object('type', e.type, 'at', e.created_at) order by e.created_at)
            from public.report_events e where e.report_id = r.id)
  from public.reports r
  left join public.locations l on l.id = r.location_id
  left join public.areas a on a.id = l.area_id
  where r.id = p_report and private.can_read_report(p_report)
$$;

create or replace function public.followed_cases()
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select f.report_id from public.report_followers f
  where f.user_id = (select auth.uid()) and f.org_id = private.my_org()
$$;

create or replace function public.authority_cases()
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select r.id from public.reports r
  where r.org_id = private.my_org() and private.my_role() = 'higher_authority' and r.escalation_level = 2
$$;
```

### 8.2 Remaining status-change functions (same pattern as 8.1)

| Function | Who | From → to | Also does |
|---|---|---|---|
| `edit_report(id, note, issue_type, location…)` | reporter | submitted → submitted | recomputes `due_at` if type changes; event `edited` |
| `cancel_report(id)` | reporter | submitted → cancelled | event |
| `reject_report(id, reason)` | admin | submitted → rejected | `close_reason` required; notify reporter |
| `correct_issue_type(id, type)` | admin | any open status | `due_at` = `created_at` + new deadline; old type in event `type_changed` |
| `set_waste_category(id, category)` | admin | any open status | recomputes `due_at` (hazardous rule); event `category_changed` |
| `return_report(id, reason)` | assigned worker | assigned → returned | unassign; notify admins |
| `close_report(id, reason, valid)` | admin | awaiting_review / disputed → closed | `sla_met`; stores `closed_as_valid`; if valid → `award_points` (D3) |
| `reopen_report(id, reason, photo)` | reporter | closed → reopened, within `reopen_window_days` of `closed_at` | `reopen_count + 1`; notify admins |
| `follow_report(id)` | resident | open case at a registered location | insert `report_followers`; no new report |
| `add_instruction(id, note)` | supervisor, higher authority | any open status | event `instruction`; notify admin + worker |
| `add_evidence(id, photo, note)` 🆕 (R4) | reporter or follower | any open status | event `evidence_added` (photo in `<org_id>/reports/<id>/evidence-<n>.jpg`); notify admins; no new report |
| `add_delay_note(id, reason, next_step)` 🆕 (R5) | admin, assigned worker | open and overdue | event `delay_note` with `data {reason, next_step}`; notify admins + supervisors; `due_at` unchanged |
| `create_pickup(…)` | resident, admin | → requested | checks `max_open_pickups`; notify admins. **Every pickup function also writes a `pickup_events` row (D1).** |
| `edit_pickup(…)` / `cancel_pickup(id)` | requester (edit only while requested); requester or admin (cancel) | requested → requested / requested, scheduled → cancelled | |
| `schedule_pickup(id, date, slot, worker, trip_stop?)` | admin | requested, missed → scheduled | notify resident + worker |
| `reschedule_pickup(id, date, slot)` | admin | scheduled → scheduled | old date and slot saved in `pickup_events` (D1, D4); notify resident + worker |
| `decline_pickup(id, reason)` | admin | requested → declined | notify resident |
| `collect_pickup(id, segregation_ok, photo)` | assigned worker, admin | scheduled → collected | segregation policy (03 F6): notify with awareness link; warning at threshold |
| `refuse_pickup(id, reason, photo)` | assigned worker, admin; only if policy = `refuse_allowed` | scheduled → refused | notify resident + admins |
| `start_trip(id, lat, lng)` | trip driver | planned → in_progress | event `start` |
| `record_stop(stop, action, segregation_ok, reason, lat, lng)` | trip driver | stop pending → collected / skipped / refused | stop must belong to this trip and driver; linked pickup → collected / refused; `arrived` tap far from every planned stop and disposal site → `unapproved_stop_count + 1`, notify admins |
| `record_disposal_scan(trip, token, method, lat, lng)` | trip driver | — | token must be a `disposal_site` of the same organisation; inside geofence → `verified`, else `outside_geofence`; typed code counts only inside the geofence (03 F9.4c) |
| `end_trip(id)` | trip driver | in_progress → completed | no scan → `no_scan`; non-verified → notify admins; upgrades a `missed` collection run for this schedule and date to `late` |
| `deactivate_user(id)` | admin | user active → inactive | open cases → returned ("worker deactivated"); scheduled pickups unassigned; notify admins |
| `review_flag(id, outcome, note)` | role the flag is routed to | open → reviewed | |
| `reactivate_user(id)` 🆕 (I4) | admin | user inactive → active | does not restore old tasks; audit log records it |
| `save_ai_run(…)` 🆕 (S1) | **server only** (service-role key) | — | inserts the `ai_runs` row after the server has called the AI; users have no insert right |

### 8.3 Read-only functions (safe summaries)

| Function | For | Returns |
|---|---|---|
| `ai_quota_left()` | server before each AI call (04 G6) | remaining calls today for the user and the organisation (counted from `ai_runs` in the organisation's time zone) |
| `resolve_qr(token)` | resident report form | location id and name if the token is an active bin/spot of the caller's organisation |
| `get_qr_sheet()` | admin | name + `qr_code` of the organisation's locations, for printing |
| `get_dashboard_counts(area?)` | admin, supervisor, higher authority | counts by status, overdue, service measures, SLA compliance % |
| `get_scorecards(period)` | admin, supervisor, higher authority | 05 A4 measures, filtered by the flag routing |
| `get_leaderboard(area)` | residents | first name + area + points, only users with `show_on_leaderboard` |
| `get_vehicle_eta(trip)` | resident with a pickup on that trip, admin | arrival estimate (05 A6), labelled estimate |
| `get_next_collection()` | resident | next day and window for the resident's area |
| `followed_cases()` + `case_summary(id)` 🆕 (P1) | followers | status, type, place, dates, overdue, escalation level, event types — no photos, notes, feedback or names |
| `authority_cases()` + `case_summary(id)` 🆕 (P1) | higher authority | the same summary for level-2 escalations |
| `get_job_health()` 🆕 (I6) | admin | last run time and success of each of the 7 jobs, from pg_cron's run history (`cron.job_run_details`) [Verify] |

---

## 9. Background jobs (0008)

Jobs run inside the database as the system (`actor_id` null). They are in the `private` schema and have no API endpoint. [Rec] pg_cron schedules use UTC [Verify]; each job compares times in the organisation's time zone (04 G5).

### 9.1 Full SQL for three jobs

```sql
-- F5.1: overdue flag (once per case)
create or replace function private.job_overdue() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    update public.reports set overdue_notified = true
    where status in ('submitted','assigned','returned','disputed','reopened')
      and now() > due_at and not overdue_notified
    returning id, org_id
  loop
    perform private.log_event(r.org_id, r.id, null, 'overdue');
    perform private.notify_role(r.org_id, 'admin', 'overdue', 'report', r.id, 'Case is overdue');
  end loop;
end $$;

-- F5.2 / F5.2b: escalation level 1 (supervisor) and level 2 (higher authority)
create or replace function private.job_escalation() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in
    update public.reports rp set escalation_level = 1, escalated = true
    from public.organizations o
    where o.id = rp.org_id and rp.escalation_level = 0
      and rp.status in ('submitted','assigned','returned','disputed','reopened')
      and now() > rp.due_at + make_interval(hours => o.escalation_after_hours)
    returning rp.id, rp.org_id
  loop
    perform private.log_event(r.org_id, r.id, null, 'escalated');
    perform private.notify_role(r.org_id, 'supervisor', 'escalated', 'report', r.id, 'Case escalated to you');
  end loop;

  for r in
    update public.reports rp set escalation_level = 2
    from public.organizations o
    where o.id = rp.org_id and rp.escalation_level = 1
      and rp.status in ('submitted','assigned','returned','disputed','reopened')
      and now() > rp.due_at + make_interval(hours => o.escalation_level2_after_hours)
    returning rp.id, rp.org_id
  loop
    perform private.log_event(r.org_id, r.id, null, 'escalated_l2');
    perform private.notify_role(r.org_id, 'higher_authority', 'escalated_l2', 'report', r.id,
      'Case escalated to level 2');
  end loop;
end $$;

-- F13.4 / 05 A5: hotspot risk score for tomorrow (prediction from demo data, not validated)
create or replace function private.job_hotspot_risk() returns void
language sql security definer set search_path = '' as $$
  with inc as (
    select r.org_id, r.location_id,
      count(*) filter (where r.created_at > now() - interval '7 days')  as c7,
      count(*) filter (where r.created_at > now() - interval '30 days') as c30,
      count(*) as c_all,
      count(*) filter (where extract(dow from (r.created_at at time zone o.timezone))
                           = extract(dow from ((now() at time zone o.timezone)::date + 1))) as c_wd,
      bool_or(r.overdue_notified and r.status in ('submitted','assigned','returned','disputed','reopened')) as overdue_open
    from public.reports r
    join public.organizations o on o.id = r.org_id
    where r.location_id is not null and r.status not in ('rejected','cancelled')
      and r.is_new_incident                                  -- R6: count distinct incidents only
    group by r.org_id, r.location_id
  ), mx as (
    select org_id, greatest(max(c7), 1) as m7, greatest(max(c30), 1) as m30 from inc group by org_id
  )
  insert into public.location_risk (org_id, location_id, score, factors_json, computed_for_date)
  select i.org_id, i.location_id,
    least(100, round(50.0 * i.c7 / m.m7 + 30.0 * i.c30 / m.m30
                     + 20.0 * i.c_wd / greatest(i.c_all, 1)
                     + case when i.overdue_open then 10 else 0 end))::int,
    jsonb_build_object('last_7_days', i.c7, 'last_30_days', i.c30,
                       'weekday_share', round(i.c_wd::numeric / greatest(i.c_all, 1), 2),
                       'overdue_open', i.overdue_open),
    (now() at time zone o.timezone)::date + 1
  from inc i
  join mx m on m.org_id = i.org_id
  join public.organizations o on o.id = i.org_id
  on conflict (location_id, computed_for_date)
  do update set score = excluded.score, factors_json = excluded.factors_json
$$;
```

### 9.2 Remaining jobs (same pattern)

| Job function | Rule |
|---|---|
| `private.job_missed_pickups()` | `scheduled` and the slot has ended in local time (`morning_slot_end` / `afternoon_slot_end`, D2), or `requested` and local date > `preferred_date` → `missed`; create the linked report (`missed_collection`, `source = missed_pickup`, `source_pickup_id`, reporter = requester, no photo, `location_source = pickup`); notify requester + admins |
| `private.job_routine_collection()` | For each active schedule whose local weekday is in `days_of_week` and whose `end_time` has passed today with no `collection_runs` row: completed trip for this schedule today → `on_time`; otherwise `missed` + notify admins (`end_trip` later turns it into `late`) |
| `private.job_no_reply()` | `awaiting_review` for more than `no_reply_hours` with no `no_reply` event → event `no_reply` + notify admins that they may close it as "no response" |
| `private.job_performance_flags()` | Daily: for each worker, admin and area over the last `perf_period_days`, SLA met % < `perf_sla_threshold_pct` with ≥ `perf_min_cases` closed cases → insert a flag (`on conflict do nothing`), routed per 05 A4; notify that role |

### 9.3 Schedules (7 jobs)

```sql
select cron.schedule('overdue',            '*/15 * * * *', $$select private.job_overdue()$$);
select cron.schedule('escalation',         '*/15 * * * *', $$select private.job_escalation()$$);
select cron.schedule('missed-pickups',     '*/15 * * * *', $$select private.job_missed_pickups()$$);
select cron.schedule('routine-collection', '*/15 * * * *', $$select private.job_routine_collection()$$);
select cron.schedule('no-reply',           '0 * * * *',    $$select private.job_no_reply()$$);
select cron.schedule('hotspot-risk',       '30 0 * * *',   $$select private.job_hotspot_risk()$$);      -- 06:00 IST
select cron.schedule('performance-flags',  '45 0 * * *',   $$select private.job_performance_flags()$$); -- 06:15 IST
```

---

## 10. Photo storage

| Item | Setting |
|---|---|
| Bucket | `photos`, **private** (the default for new buckets). [Doc] |
| Path | `<org_id>/reports/<report_id>/before.jpg` · `…/after.jpg` · `<org_id>/pickups/<pickup_id>.jpg` · `<org_id>/trips/<trip_id>/<event_id>.jpg` |
| Upload | Only the server, with the service-role key, **after** the checks and the EXIF-stripping re-encode (04 §5 item 4). No upload policy for users. The functions also check that the path is inside the organisation's and report's folder (S2). |
| Viewing | The server first reads the record as the user (RLS decides), then creates a signed link valid for `signed_link_minutes` (demo 10). [Doc: `createSignedUrl`] |
| Failed submit | If `create_report` fails after the upload, the server deletes the uploaded file, so nothing is left behind (03 F3.6 "nothing is saved until both complete"). |
| AI analysis | The photo is sent to the AI during the form, before submit, **without storing it**; the `ai_runs` id is passed to `create_report` to link them. |

---

## 11. How to test it (with 04 G4)

1. Run the migrations in a **local** Supabase project (`supabase start`, `supabase db reset`). [Verify]
2. Seed both demo organisations with every role.
3. **Organisation isolation:** log in as each role of organisation A and try to read every table of organisation B → must return 0 rows.
4. **Functions only:** as a resident, try a direct `update reports set status = 'closed'` → must fail.
5. **Transitions:** call each function from a wrong status → must fail with a clear message.
6. **Jobs:** set a seeded case's `due_at` in the past, run `select private.job_overdue()` and `private.job_escalation()` → flags, events and notifications appear once, not twice.
7. **Rewards:** close the same report twice (after a reopen) → points only once per reason.
8. **QR:** as a resident, `select qr_code from locations` → must fail (column not granted).

---

### 11.1 Test result (2026-09-30, PGlite)

| Check | Result |
|---|---|
| All 10 SQL blocks load in order | ✅ |
| Sign-up trigger forces `resident`; area from another organisation rejected | ✅ |
| Hazardous category gives the 6 h deadline; AI suggestion linked to the report | ✅ |
| Organisation isolation: other organisation sees 0 reports and 0 timeline events | ✅ |
| Higher authority sees a case only at escalation level 2 | ✅ |
| Direct status update, reading `qr_code`, logged-out reads → permission denied | ✅ |
| Wrong organisation / wrong role / wrong status → "Not allowed" | ✅ |
| Worker completion 1.1 km away → `far_from_site` flag + admin notification | ✅ |
| Resident "Resolved" → closed, `sla_met`, `closed_as_valid`; 10 + 5 + 5 points; awarding again adds nothing | ✅ |
| Overdue job twice → one event; escalation to level 1 then 2 with supervisor and higher-authority notifications | ✅ |
| Hotspot risk job writes a score with its factors; 7 cron schedules registered | ✅ |
| All 21 tables have RLS enabled | ✅ |
| **Bug found and fixed:** the server could not read back its own `ai_runs` row after inserting it → added `ai_runs_read_own` | ✅ fixed |

Not tested here: real Supabase Auth, Storage, pg_cron timing, and the functions listed only as contracts (§8.2, §9.2).

### 11.2 Re-test after the expert re-audit (2026-09-30, PGlite) 🆕

All 12 SQL blocks load; **48 of 48 checks pass** (the 34 above plus 14 new).

| New check | Result |
|---|---|
| S1 resident inserts a fake AI result | ✅ refused (permission denied) |
| S2 photo path of another organisation / after-photo outside the report folder | ✅ refused ("Invalid photo") |
| S3 200,000-character note | ✅ refused (length check) |
| F1 second resident sees the open case at the same bin; other organisation sees nothing | ✅ |
| F2 reporter sees the worker's first name; a stranger gets nothing | ✅ |
| I1 location linked to another organisation's area | ✅ refused |
| I2 daily limit −5 | ✅ refused |
| I3 admin deletes a location | ✅ refused |
| F3 settings change recorded with actor, old and new value; residents cannot read the log | ✅ |
| I5 `updated_at` changes on update | ✅ |
| All 22 tables have RLS | ✅ |

### 11.3 Re-test after the research re-audit (2026-09-30, PGlite) 🆕

**57 of 57 checks pass.** New: follower cannot read the full case row or timeline notes, gets the summary only, and no names (P1) · higher authority: summary of the level-2 case, no full row (P1) · phone 1.1 km from the scanned bin → `location_mismatch`, raw GPS kept (R1) · second report at an open place → not a new incident (R6) · report without category refused (R7) · satisfaction stored and the feedback event records the attempt number (R2, R3).

## 12. Decisions found while writing the schema (✅ decided by the team, 2026-09-30)

| # | Gap | Options | Decision |
|---|---|---|---|
| D1 | **Pickup history is not stored.** 03 F6.2c says a reschedule is "logged", but the data model has no pickup history table (`report_events` is only for reports). | (a) add a `pickup_events` table (21 tables); (b) log only through notifications; (c) accept no history for pickups | ✅ (a) `pickup_events` added (table 21) |
| D2 | **Slot times are not defined.** The missed-pickup job needs to know when "morning" and "afternoon" end. | (a) organisation settings `morning_slot_end` / `afternoon_slot_end` (demo 12:00 / 17:00); (b) fixed in code | ✅ (a) `organizations.morning_slot_end` 12:00, `afternoon_slot_end` 17:00 (demo) |
| D3 | **"Admin closed as valid" is not a stored field.** Rewards need to know if an admin close (after a dispute or no reply) counts as verified (05 A8). | (a) `close_report` takes `valid yes/no` and stores it in `close_reason`; (b) admin closes never give points | ✅ (a) `close_report` takes valid yes/no, stored in new column `reports.closed_as_valid` (clearer than packing it into `close_reason`); resident 'Resolved' sets it true |
| D4 | **`preferred_date` is overwritten by scheduling.** The resident's original choice is lost after reschedule. | (a) keep in history (D1); (b) add `scheduled_date` column | ✅ solved by D1: `pickup_events.old_date` / `old_slot` |

---

## 13. Expert re-audit (2026-09-30) 🆕

Each problem was **proven on the test database before fixing**, then re-tested after the fix (§11.2).

| # | Problem found | Fix |
|---|---|---|
| S1 | Users could insert their own "AI result" and claim hazardous waste (shorter deadline, +10 bonus points) | `ai_runs` written only by the server (service-role key); users only read their own |
| S2 | A report could point to another organisation's photo file | Functions check the photo path is in `<org_id>/reports/<report_id>/` |
| S3 | No length limits in the database (a 200,000-character note was accepted) | Length checks on all free-text columns (§3.1) |
| F1 | The duplicate warning was impossible — residents cannot see others' cases | `open_case_at(location)`, returning only case id, type, status, date |
| F2 | Residents could not see the worker's name, workers not the reporter's | `case_people(report)`, first names only, for people who can read the case |
| F3 | Setup changes had no history, against 03 §3 "every change writes an event" | `admin_audit_log` table (22 tables) filled by triggers |
| I1 | An admin could link a location to another organisation's area | Links that include `org_id` (§3.1) |
| I2 | Settings accepted nonsense (daily limit −5) | Range checks on `organizations` (§3.1) |
| I3 | Admins could delete areas, locations, vehicles used by old reports | Delete right removed; deactivate instead |
| I4 | No way to reactivate a worker | `reactivate_user` |
| I5 | `pickup_requests.updated_at` never changed | Trigger |
| I6 | A failed background job would go unnoticed | `get_job_health()` for admins |

**Known limits (labelled, not fixed):** phone GPS can be faked, so far-from-site and dumping checks are signals, not proof (already labelled *simulated*). There is no process for a person asking for their data to be deleted — fine for sample data, needs a policy before real use; which privacy law applies is unverified.

### 13.1 Research re-audit (2026-09-30) 🆕

Checked against the PRD, the proposal and our research.

| # | Finding | Fix |
|---|---|---|
| P1 | **Privacy (proven on the test database):** a follower could read the reporter's private feedback comment, photo paths and timeline notes; PRD says outcome and feedback are visible only to reporter, assigned worker and admins | Full rows only for reporter, worker, admin, supervisor; followers and higher authority get `case_summary()` (no photos, notes, feedback, names) |
| R1 | Research: store GPS accuracy and allow pin correction; a QR can be copied or a bin moved | `device_lat/lng` (raw GPS) kept apart from the corrected incident location; `location_corrected`; `location_mismatch` when the phone is far from the chosen bin |
| R2 | Research: store satisfaction separately from resolved | Optional `satisfaction` (satisfied / neutral / unsatisfied — team decision) |
| R3 | Research: tie each response to a specific resolution attempt | `attempt_count`; a `feedback` event with `data {feedback, satisfaction, attempt}` |
| R4 | Research: follow **or add evidence** | `add_evidence()` |
| R5 | Research: record delay reason and next action | `add_delay_note()` |
| R6 | Research: count distinct incidents, not many reports of one open incident | `is_new_incident` set at creation; hotspot counts and risk score use it |
| R7 | Waste category could be empty | Required (`mixed_uncertain` allowed), except the auto-created missed-pickup complaint |

Nothing in 03 §8 was renamed or removed. After D1–D3 the data model gains `pickup_events`, two slot settings and `reports.closed_as_valid` (also added to 03 §8). The schema adds only database mechanics (constraints, indexes, unique keys, column grants, `updated_at` already listed, `feature` default).
