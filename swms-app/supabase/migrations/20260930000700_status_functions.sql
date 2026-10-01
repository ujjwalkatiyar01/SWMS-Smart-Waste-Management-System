-- 0007 — 06 §8.1 and §8.1b (only the functions written in full SQL; §8.2 rule-only functions come with their feature). Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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
