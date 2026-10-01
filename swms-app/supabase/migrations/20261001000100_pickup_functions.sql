-- Pickup lifecycle from 03 F6 and 06 §8.2. Each function owns one allowed transition.

create or replace function public.create_pickup(
  p_id uuid, p_waste_type text, p_preferred_date date, p_slot text, p_address text, p_note text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me public.users;
  v_org public.organizations;
  v_existing public.pickup_requests;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active for update;
  if v_me.id is null or v_me.role not in ('resident','admin') then raise exception 'Not allowed'; end if;
  select * into v_existing from public.pickup_requests where id = p_id;
  if v_existing.id is not null then
    if v_existing.requester_id = v_me.id and v_existing.org_id = v_me.org_id then return p_id; end if;
    raise exception 'Not allowed';
  end if;
  select * into v_org from public.organizations where id = v_me.org_id;
  if p_waste_type not in ('wet','dry','hazardous','bulky','e_waste') or p_slot not in ('morning','afternoon')
     or p_preferred_date is null or p_preferred_date < (now() at time zone v_org.timezone)::date
     or nullif(trim(p_address), '') is null or length(p_address) > 300
     or length(coalesce(p_note, '')) > 1000 then raise exception 'Invalid pickup details'; end if;
  if (select count(*) from public.pickup_requests
      where requester_id = v_me.id and status in ('requested','scheduled')) >= v_org.max_open_pickups then
    raise exception 'Open pickup limit reached';
  end if;
  insert into public.pickup_requests (id, org_id, requester_id, waste_type, preferred_date, slot, address, note)
  values (p_id, v_me.org_id, v_me.id, p_waste_type, p_preferred_date, p_slot, trim(p_address), nullif(trim(p_note), ''));
  insert into public.pickup_events (org_id, pickup_id, actor_id, type)
  values (v_me.org_id, p_id, v_me.id, 'created');
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  select v_me.org_id, u.id, 'pickup_created', 'pickup', p_id, 'A new pickup request needs review.'
  from public.users u where u.org_id = v_me.org_id and u.role = 'admin' and u.active and u.id <> v_me.id;
  return p_id;
end $$;

create or replace function public.edit_pickup(
  p_pickup uuid, p_waste_type text, p_preferred_date date, p_slot text, p_address text, p_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests; v_org public.organizations;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_p.id is null or v_p.org_id <> v_me.org_id
     or v_p.requester_id <> v_me.id or v_p.status <> 'requested' then raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_me.org_id;
  if p_waste_type not in ('wet','dry','hazardous','bulky','e_waste') or p_slot not in ('morning','afternoon')
     or p_preferred_date is null or p_preferred_date < (now() at time zone v_org.timezone)::date
     or nullif(trim(p_address), '') is null or length(p_address) > 300
     or length(coalesce(p_note, '')) > 1000 then raise exception 'Invalid pickup details'; end if;
  update public.pickup_requests set waste_type = p_waste_type, preferred_date = p_preferred_date,
    slot = p_slot, address = trim(p_address), note = nullif(trim(p_note), '') where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type)
  values (v_me.org_id, p_pickup, v_me.id, 'edited');
end $$;

create or replace function public.cancel_pickup(p_pickup uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_p.id is null or v_p.org_id <> v_me.org_id
     or (v_p.requester_id <> v_me.id and v_me.role <> 'admin')
     or v_p.status not in ('requested','scheduled') then raise exception 'Not allowed'; end if;
  update public.pickup_requests set status = 'cancelled' where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type)
  values (v_me.org_id, p_pickup, v_me.id, 'cancelled');
  if v_p.requester_id <> v_me.id then
    insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
    values (v_me.org_id, v_p.requester_id, 'pickup_cancelled', 'pickup', p_pickup, 'Your pickup request was cancelled.');
  end if;
end $$;

create or replace function public.schedule_pickup(p_pickup uuid, p_date date, p_slot text, p_worker uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests; v_org public.organizations;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_me.role <> 'admin' or v_p.id is null or v_p.org_id <> v_me.org_id
     or v_p.status not in ('requested','missed') then raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_me.org_id;
  if p_date is null or p_date < (now() at time zone v_org.timezone)::date
     or p_slot not in ('morning','afternoon') then raise exception 'Invalid pickup details'; end if;
  if p_worker is not null and not exists (select 1 from public.users
       where id = p_worker and org_id = v_me.org_id and role = 'worker' and active) then raise exception 'Worker not available'; end if;
  update public.pickup_requests set status = 'scheduled', preferred_date = p_date, slot = p_slot,
    assigned_worker_id = p_worker where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type, old_date, old_slot)
  values (v_me.org_id, p_pickup, v_me.id, 'scheduled', v_p.preferred_date, v_p.slot);
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  values (v_me.org_id, v_p.requester_id, 'pickup_scheduled', 'pickup', p_pickup, 'Your pickup has been scheduled.');
  if p_worker is not null then
    insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
    values (v_me.org_id, p_worker, 'pickup_assigned', 'pickup', p_pickup, 'A pickup has been assigned to you.');
  end if;
end $$;

create or replace function public.reschedule_pickup(p_pickup uuid, p_date date, p_slot text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests; v_org public.organizations;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_me.role <> 'admin' or v_p.id is null or v_p.org_id <> v_me.org_id
     or v_p.status <> 'scheduled' then raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_me.org_id;
  if p_date is null or p_date < (now() at time zone v_org.timezone)::date
     or p_slot not in ('morning','afternoon') then raise exception 'Invalid pickup details'; end if;
  update public.pickup_requests set preferred_date = p_date, slot = p_slot where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type, old_date, old_slot)
  values (v_me.org_id, p_pickup, v_me.id, 'rescheduled', v_p.preferred_date, v_p.slot);
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  values (v_me.org_id, v_p.requester_id, 'pickup_rescheduled', 'pickup', p_pickup, 'Your pickup date or slot changed.');
  if v_p.assigned_worker_id is not null then
    insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
    values (v_me.org_id, v_p.assigned_worker_id, 'pickup_rescheduled', 'pickup', p_pickup, 'An assigned pickup was rescheduled.');
  end if;
end $$;

create or replace function public.decline_pickup(p_pickup uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_me.role <> 'admin' or v_p.id is null or v_p.org_id <> v_me.org_id
     or v_p.status <> 'requested' then raise exception 'Not allowed'; end if;
  if nullif(trim(p_reason), '') is null or length(p_reason) > 1000 then raise exception 'Add a reason'; end if;
  update public.pickup_requests set status = 'declined', decline_reason = trim(p_reason) where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type, note)
  values (v_me.org_id, p_pickup, v_me.id, 'declined', trim(p_reason));
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  values (v_me.org_id, v_p.requester_id, 'pickup_declined', 'pickup', p_pickup, 'Your pickup request was declined.');
end $$;

create or replace function public.collect_pickup(p_pickup uuid, p_segregation_ok boolean, p_photo_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests; v_org public.organizations; v_count int;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_p.id is null or v_p.org_id <> v_me.org_id or v_p.status <> 'scheduled'
     or (v_me.role <> 'admin' and (v_me.role <> 'worker' or v_p.assigned_worker_id <> v_me.id)) then
    raise exception 'Not allowed'; end if;
  if p_segregation_ok is null then raise exception 'Choose segregation result'; end if;
  if p_photo_url is not null and p_photo_url not like v_me.org_id::text || '/pickups/' || p_pickup::text || '/%' then
    raise exception 'Invalid photo'; end if;
  select * into v_org from public.organizations where id = v_me.org_id;
  update public.pickup_requests set status = 'collected', segregation_ok = p_segregation_ok,
    photo_url = p_photo_url where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type)
  values (v_me.org_id, p_pickup, v_me.id, 'collected');
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  values (v_me.org_id, v_p.requester_id, 'pickup_collected', 'pickup', p_pickup, 'Your pickup was collected.');
  if not p_segregation_ok then
    insert into public.pickup_events (org_id, pickup_id, actor_id, type)
    values (v_me.org_id, p_pickup, v_me.id, 'not_segregated');
    insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
    values (v_me.org_id, v_p.requester_id, 'segregation_guide', 'pickup', p_pickup,
            'Please see the segregation guide before your next pickup.');
    if v_org.segregation_policy = 'warn_escalate' then
      select count(*) into v_count from public.pickup_requests p
      where p.requester_id = v_p.requester_id and p.segregation_ok = false
        and p.updated_at >= now() - make_interval(days => v_org.segregation_warn_window_days);
      if v_count >= v_org.segregation_warn_threshold then
        insert into public.pickup_events (org_id, pickup_id, actor_id, type)
        values (v_me.org_id, p_pickup, v_me.id, 'segregation_warning');
        insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
        select v_me.org_id, u.id, 'segregation_warning', 'pickup', p_pickup,
               'A household has reached the segregation warning threshold.'
        from public.users u where u.org_id = v_me.org_id and u.role = 'admin' and u.active;
      end if;
    end if;
  end if;
end $$;

create or replace function public.refuse_pickup(p_pickup uuid, p_reason text, p_photo_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.users; v_p public.pickup_requests; v_org public.organizations;
begin
  select * into v_me from public.users where id = (select auth.uid()) and active;
  select * into v_p from public.pickup_requests where id = p_pickup for update;
  if v_me.id is null or v_p.id is null or v_p.org_id <> v_me.org_id or v_p.status <> 'scheduled'
     or (v_me.role <> 'admin' and (v_me.role <> 'worker' or v_p.assigned_worker_id <> v_me.id)) then
    raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_me.org_id;
  if v_org.segregation_policy <> 'refuse_allowed' then raise exception 'Not allowed'; end if;
  if nullif(trim(p_reason), '') is null or p_photo_url is null
     or p_photo_url not like v_me.org_id::text || '/pickups/' || p_pickup::text || '/%'
     or length(p_reason) > 1000 then raise exception 'Photo and reason required'; end if;
  update public.pickup_requests set status = 'refused', refuse_reason = trim(p_reason), photo_url = p_photo_url,
    segregation_ok = false where id = p_pickup;
  insert into public.pickup_events (org_id, pickup_id, actor_id, type, note)
  values (v_me.org_id, p_pickup, v_me.id, 'refused', trim(p_reason));
  insert into public.notifications (org_id, user_id, type, record_type, record_id, message)
  values (v_me.org_id, v_p.requester_id, 'pickup_refused', 'pickup', p_pickup,
          'Your pickup was refused because the waste was not segregated. See the awareness guide and request again.');
end $$;
