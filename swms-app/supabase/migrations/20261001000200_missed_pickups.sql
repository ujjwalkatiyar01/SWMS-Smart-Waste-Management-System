-- F6: a passed pickup slot becomes missed and creates one linked complaint.
create unique index if not exists reports_one_per_missed_pickup
  on public.reports (source_pickup_id) where source_pickup_id is not null;

create or replace function private.job_missed_pickups() returns void
language plpgsql security definer set search_path = '' as $$
declare r record; v_report uuid;
begin
  for r in
    update public.pickup_requests p set status = 'missed'
    from public.organizations o
    where o.id = p.org_id and (
      (p.status = 'requested' and (now() at time zone o.timezone)::date > p.preferred_date)
      or (p.status = 'scheduled' and now() >
        (p.preferred_date + case when p.slot = 'morning' then o.morning_slot_end
                                 else o.afternoon_slot_end end) at time zone o.timezone)
    )
    returning p.id, p.org_id, p.requester_id
  loop
    insert into public.pickup_events (org_id, pickup_id, actor_id, type)
    values (r.org_id, r.id, null, 'missed');
    insert into public.reports (org_id, reporter_id, issue_type, source,
      source_pickup_id, location_source, status, due_at, note)
    values (r.org_id, r.requester_id, 'missed_collection', 'missed_pickup',
      r.id, 'pickup', 'submitted', private.due_at_for(r.org_id, 'missed_collection', null, now()),
      'Pickup was not completed in the requested time slot.')
    returning id into v_report;
    perform private.log_event(r.org_id, v_report, null, 'created');
    perform private.notify(r.org_id, r.requester_id, 'pickup_missed', 'pickup', r.id,
      'Your pickup was missed. A linked complaint has been opened.');
    perform private.notify_role(r.org_id, 'admin', 'pickup_missed', 'pickup', r.id,
      'A pickup was missed and a linked complaint needs review.');
  end loop;
end $$;

select cron.schedule('missed-pickups', '*/15 * * * *', $$select private.job_missed_pickups()$$);
