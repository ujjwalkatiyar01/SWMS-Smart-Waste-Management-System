-- 0009 — 06 §7.3. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
