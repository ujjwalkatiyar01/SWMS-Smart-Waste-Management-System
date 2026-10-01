-- 0002 — 06 §3. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
