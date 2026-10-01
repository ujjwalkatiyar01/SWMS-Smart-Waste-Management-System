-- F2.3: admin deactivation returns open work and unassigns scheduled pickups.
create or replace function public.deactivate_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin public.users; v_target public.users; r record;
begin
  select * into v_admin from public.users where id = (select auth.uid()) and active and role = 'admin';
  select * into v_target from public.users where id = p_user for update;
  if v_admin.id is null or v_target.id is null or v_target.org_id <> v_admin.org_id
     or v_target.id = v_admin.id or v_target.role not in ('worker','supervisor') then
    raise exception 'Not allowed';
  end if;
  if not v_target.active then return; end if;
  update public.users set active = false where id = p_user;
  for r in
    update public.reports set status = 'returned', assigned_worker_id = null
    where org_id = v_admin.org_id and assigned_worker_id = p_user
      and status in ('assigned','returned','disputed','reopened')
    returning id, reporter_id
  loop
    perform private.log_event(v_admin.org_id, r.id, v_admin.id, 'worker_deactivated',
      'Assigned worker was deactivated; case returned to admin.');
    perform private.notify(v_admin.org_id, r.reporter_id, 'returned', 'report', r.id,
      'Your case was returned to the admin for reassignment.');
    perform private.notify_role(v_admin.org_id, 'admin', 'worker_deactivated', 'report', r.id,
      'A worker was deactivated; this case needs reassignment.');
  end loop;
  for r in
    update public.pickup_requests set assigned_worker_id = null
    where org_id = v_admin.org_id and assigned_worker_id = p_user and status = 'scheduled'
    returning id, requester_id
  loop
    insert into public.pickup_events (org_id, pickup_id, actor_id, type, note)
    values (v_admin.org_id, r.id, v_admin.id, 'worker_unassigned', 'Assigned worker was deactivated.');
    perform private.notify_role(v_admin.org_id, 'admin', 'pickup_unassigned', 'pickup', r.id,
      'A worker was deactivated; this pickup needs a new assignment.');
  end loop;
end $$;

create or replace function public.reactivate_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_admin public.users; v_target public.users;
begin
  select * into v_admin from public.users where id = (select auth.uid()) and active and role = 'admin';
  select * into v_target from public.users where id = p_user for update;
  if v_admin.id is null or v_target.id is null or v_target.org_id <> v_admin.org_id
     or v_target.role not in ('worker','supervisor') then raise exception 'Not allowed'; end if;
  update public.users set active = true where id = p_user;
end $$;

revoke all on function public.deactivate_user(uuid), public.reactivate_user(uuid) from public, anon;
grant execute on function public.deactivate_user(uuid), public.reactivate_user(uuid) to authenticated;
