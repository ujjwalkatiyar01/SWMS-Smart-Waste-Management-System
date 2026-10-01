-- 0002b — 06 §3.1 (renamed: the Supabase CLI accepts digit-only versions). Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
