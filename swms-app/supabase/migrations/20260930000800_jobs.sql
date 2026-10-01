-- 0008 — 06 §9.1 + §9.3 (only the three jobs written in full SQL are scheduled). Source of truth: DOCUMENTATION/06-PHYSICAL-SCHEMA.md; copied without changes.

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

select cron.schedule('overdue',            '*/15 * * * *', $$select private.job_overdue()$$);
select cron.schedule('escalation',         '*/15 * * * *', $$select private.job_escalation()$$);
select cron.schedule('hotspot-risk',       '30 0 * * *',   $$select private.job_hotspot_risk()$$);      -- 06:00 IST
