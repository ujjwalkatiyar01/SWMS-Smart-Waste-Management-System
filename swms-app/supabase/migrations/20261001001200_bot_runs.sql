-- F14: audit and atomically limit text-chat model calls without changing photo analysis.
alter table public.ai_runs drop constraint ai_runs_feature_check;
alter table public.ai_runs add constraint ai_runs_feature_check
  check (feature in ('classify_photo', 'chat'));

create or replace function public.reserve_bot_run(p_user uuid, p_model text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user public.users; v_org public.organizations; v_user_count int; v_org_count int; v_id uuid;
begin
  select * into v_user from public.users where id = p_user and active;
  if v_user.id is null then raise exception 'Not allowed'; end if;
  select * into v_org from public.organizations where id = v_user.org_id for update;
  select count(*) filter (where user_id = p_user), count(*)
    into v_user_count, v_org_count from public.ai_runs a
    where a.org_id = v_org.id
      and (a.created_at at time zone v_org.timezone)::date = (now() at time zone v_org.timezone)::date;
  if v_user_count >= v_org.ai_daily_limit_per_user or v_org_count >= v_org.ai_daily_limit_per_org then
    raise exception 'AI limit reached';
  end if;
  insert into public.ai_runs (org_id, user_id, feature, provider, model, error)
  values (v_org.id, p_user, 'chat', 'gemini', p_model, 'pending') returning id into v_id;
  return v_id;
end $$;

revoke all on function public.reserve_bot_run(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_bot_run(uuid, text) to service_role;
