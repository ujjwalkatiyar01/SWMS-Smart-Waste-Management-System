-- A1: organisation-local daily AI quota and an atomic, server-only reservation.
create or replace function public.ai_quota_left()
returns table (user_left int, org_left int)
language sql stable security definer set search_path = '' as $$
  select greatest(0, o.ai_daily_limit_per_user - count(a.id) filter (where a.user_id = u.id)::int),
         greatest(0, o.ai_daily_limit_per_org - count(a.id)::int)
  from public.users u
  join public.organizations o on o.id = u.org_id
  left join public.ai_runs a on a.org_id = o.id
    and (a.created_at at time zone o.timezone)::date = (now() at time zone o.timezone)::date
  where u.id = (select auth.uid()) and u.active and u.role in ('resident','admin')
  group by u.id, o.id
$$;

create or replace function public.reserve_ai_run(p_user uuid, p_model text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user public.users; v_org public.organizations; v_user_count int; v_org_count int; v_id uuid;
begin
  select * into v_user from public.users where id = p_user and active and role in ('resident','admin');
  if v_user.id is null then raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_user.org_id for update;
  select count(*) filter (where user_id = p_user), count(*)
    into v_user_count, v_org_count from public.ai_runs a
    where a.org_id = v_org.id
      and (a.created_at at time zone v_org.timezone)::date = (now() at time zone v_org.timezone)::date;
  if v_user_count >= v_org.ai_daily_limit_per_user or v_org_count >= v_org.ai_daily_limit_per_org then
    raise exception 'AI limit reached';
  end if;
  insert into public.ai_runs (org_id, user_id, provider, model, error)
  values (v_org.id, p_user, 'gemini', p_model, 'pending') returning id into v_id;
  return v_id;
end $$;

revoke all on function public.ai_quota_left() from public, anon;
grant execute on function public.ai_quota_left() to authenticated;
revoke all on function public.reserve_ai_run(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_ai_run(uuid, text) to service_role;
