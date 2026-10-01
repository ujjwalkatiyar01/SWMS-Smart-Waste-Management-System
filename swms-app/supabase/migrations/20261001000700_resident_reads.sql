-- Resident read functions from 06 §8.3: opt-in area leaderboard (A8) and next routine collection (F12.3).

-- First name, area and points of residents who opted in; only the viewer's own organisation.
-- p_area limits it to one area; without it the viewer's home area is used.
create or replace function public.get_leaderboard(p_area uuid default null)
returns table (first_name text, area_name text, points bigint)
language sql stable security definer set search_path = '' as $$
  select split_part(u.name, ' ', 1), a.name, coalesce(sum(r.points), 0)::bigint as total
  from public.users u
  join public.areas a on a.id = u.area_id
  left join public.reward_events r on r.user_id = u.id
  where private.my_role() in ('resident','admin','supervisor','higher_authority')
    and u.org_id = private.my_org() and u.role = 'resident' and u.active and u.show_on_leaderboard
    and u.area_id = coalesce(p_area, (select me.area_id from public.users me where me.id = (select auth.uid())))
  group by u.id, u.name, a.name
  order by total desc, 1
  limit 10
$$;

-- The next active schedule for the viewer's home area, in the organisation's local time.
create or replace function public.get_next_collection()
returns table (collection_date date, start_time time, end_time time, waste_type text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select u.area_id, o.timezone, (now() at time zone o.timezone) as local_now
    from public.users u join public.organizations o on o.id = u.org_id
    where u.id = (select auth.uid()) and u.active
  )
  select d::date, s.start_time, s.end_time, s.waste_type
  from me
  cross join generate_series(me.local_now::date, me.local_now::date + 7, interval '1 day') as d
  join public.collection_schedules s on s.area_id = me.area_id and s.active
    and extract(dow from d)::smallint = any (s.days_of_week)
  where d::date > me.local_now::date or s.end_time > me.local_now::time
  order by d, s.start_time
  limit 1
$$;

revoke all on function public.get_leaderboard(uuid), public.get_next_collection() from public, anon;
grant execute on function public.get_leaderboard(uuid), public.get_next_collection() to authenticated;
