-- 0003 — 06 §4. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
