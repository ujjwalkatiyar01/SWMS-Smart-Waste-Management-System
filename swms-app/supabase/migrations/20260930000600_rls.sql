-- 0006 — 06 §7.2. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
