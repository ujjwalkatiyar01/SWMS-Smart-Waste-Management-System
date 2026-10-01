-- 0004 — 06 §5. Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
