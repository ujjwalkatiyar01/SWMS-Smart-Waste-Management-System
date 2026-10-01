-- 1100 — Worker duties, work-area check-in and driver routes (user decisions 2026-10-01).
-- * The admin gives a worker a duty: a place (heavy-waste spots first), a task, a shift and one or more
--   dates (one row per date). The worker starts it on the day and finishes it with an after-photo.
-- * At worker login the worker states the block / area they are working in now (check-in).
-- * A driver's trip records where it started and was heading, and its route as GPS points.

-- ---------- check-in: the block a worker is working in now ----------
create table public.worker_checkins (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  worker_id uuid not null,
  area_id uuid not null,
  checked_in_at timestamptz not null default now(),
  foreign key (worker_id, org_id) references public.users (id, org_id),
  foreign key (area_id, org_id) references public.areas (id, org_id)
);
create index on public.worker_checkins (worker_id, checked_in_at desc);
create index on public.worker_checkins (org_id, checked_in_at desc);

-- ---------- duties ----------
create table public.worker_duties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  worker_id uuid not null,
  area_id uuid not null,
  location_id uuid,
  duty_date date not null,
  start_time time not null,
  end_time time not null,
  task text not null check (length(trim(task)) between 3 and 500),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'done', 'cancelled')),
  started_at timestamptz,
  start_lat double precision, start_lng double precision,
  done_at timestamptz,
  done_lat double precision, done_lng double precision,
  photo_url text,
  done_note text check (length(done_note) <= 1000),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (worker_id, duty_date, start_time),   -- a repeated "create" never doubles a shift
  foreign key (worker_id, org_id) references public.users (id, org_id),
  foreign key (area_id, org_id) references public.areas (id, org_id),
  foreign key (location_id, org_id) references public.locations (id, org_id)
);
create index on public.worker_duties (org_id, duty_date);
create index on public.worker_duties (worker_id, duty_date);

alter table public.worker_checkins enable row level security;
alter table public.worker_duties enable row level security;
create policy checkins_read on public.worker_checkins for select to authenticated
  using (org_id = (select private.my_org()) and (
    worker_id = (select auth.uid()) or (select private.my_role()) in ('admin', 'supervisor')));
create policy duties_read on public.worker_duties for select to authenticated
  using (org_id = (select private.my_org()) and (
    worker_id = (select auth.uid()) or (select private.my_role()) in ('admin', 'supervisor')));
revoke all on public.worker_checkins, public.worker_duties from anon;
revoke insert, update, delete on public.worker_checkins, public.worker_duties from authenticated;

create or replace function private.org_today() returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone o.timezone)::date from public.organizations o where o.id = private.my_org()
$$;

create or replace function public.check_in(p_area uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() is distinct from 'worker' then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.areas a where a.id = p_area and a.org_id = private.my_org() and a.active) then
    raise exception 'Choose a work area of your organisation';
  end if;
  insert into public.worker_checkins (org_id, worker_id, area_id) values (private.my_org(), auth.uid(), p_area);
end $$;

-- Admin moves a worker to a different home work area (the area duties are usually planned in).
create or replace function public.set_worker_area(p_worker uuid, p_area uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() is distinct from 'admin' then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.areas a where a.id = p_area and a.org_id = private.my_org() and a.active) then
    raise exception 'Choose a work area of your organisation';
  end if;
  update public.users set area_id = p_area
  where id = p_worker and org_id = private.my_org() and role = 'worker';
  if not found then raise exception 'Not allowed'; end if;
end $$;

create or replace function public.create_duties(
  p_worker uuid, p_area uuid, p_location uuid, p_task text, p_dates date[], p_start time, p_end time
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := private.my_org();
  v_today date := private.org_today();
  v_count int;
begin
  if private.my_role() is distinct from 'admin' then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.users u where u.id = p_worker and u.org_id = v_org and u.role = 'worker' and u.active) then
    raise exception 'Choose an active worker';
  end if;
  if not exists (select 1 from public.areas a where a.id = p_area and a.org_id = v_org and a.active) then
    raise exception 'Choose a work area of your organisation';
  end if;
  if p_location is not null and not exists (select 1 from public.locations l
     where l.id = p_location and l.org_id = v_org and l.active and (l.area_id = p_area or l.area_id is null)) then
    raise exception 'Choose a place in this area';
  end if;
  if p_end <= p_start then raise exception 'End time must be after start time'; end if;
  if coalesce(array_length(p_dates, 1), 0) not between 1 and 31
     or exists (select 1 from unnest(p_dates) d where d < v_today or d > v_today + 60) then
    raise exception 'Choose dates from today up to 60 days ahead';
  end if;

  insert into public.worker_duties (org_id, worker_id, area_id, location_id, duty_date, start_time, end_time, task, created_by)
  select distinct v_org, p_worker, p_area, p_location, d, p_start, p_end, trim(p_task), auth.uid() from unnest(p_dates) d
  on conflict (worker_id, duty_date, start_time) do nothing;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform private.notify(v_org, p_worker, 'duty_assigned', 'duty', null,
      'New duty: ' || left(trim(p_task), 80) || ' (' || v_count || case when v_count = 1 then ' day)' else ' days)' end);
  end if;
  return v_count;
end $$;

create or replace function public.cancel_duty(p_duty uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_worker uuid;
begin
  if private.my_role() is distinct from 'admin' then raise exception 'Not allowed'; end if;
  update public.worker_duties set status = 'cancelled'
  where id = p_duty and org_id = private.my_org() and status = 'scheduled'
  returning worker_id into v_worker;
  if v_worker is null then raise exception 'Only a duty that has not started can be cancelled'; end if;
  perform private.notify(private.my_org(), v_worker, 'duty_cancelled', 'duty', p_duty, 'A duty was cancelled by the admin');
end $$;

create or replace function public.start_duty(p_duty uuid, p_lat double precision default null, p_lng double precision default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.worker_duties set status = 'in_progress', started_at = now(), start_lat = p_lat, start_lng = p_lng
  where id = p_duty and worker_id = auth.uid() and private.my_role() = 'worker'
    and status = 'scheduled' and duty_date = private.org_today();
  if not found then raise exception 'This duty cannot be started now'; end if;
end $$;

create or replace function public.complete_duty(
  p_duty uuid, p_photo text, p_note text default null, p_lat double precision default null, p_lng double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_photo is null or p_photo not like private.my_org()::text || '/duties/' || p_duty::text || '/%' then
    raise exception 'Add an after-photo';
  end if;
  update public.worker_duties
  set status = 'done', done_at = now(), photo_url = p_photo, done_note = nullif(trim(p_note), ''), done_lat = p_lat, done_lng = p_lng
  where id = p_duty and worker_id = auth.uid() and private.my_role() = 'worker' and status = 'in_progress';
  if not found then raise exception 'Start this duty first'; end if;
end $$;

-- ---------- driver routes ----------
alter table public.vehicle_trips
  add column from_area_id uuid,
  add column to_area_id uuid,
  add column distance_m double precision not null default 0,
  add foreign key (from_area_id, org_id) references public.areas (id, org_id),
  add foreign key (to_area_id, org_id) references public.areas (id, org_id);

create table public.trip_points (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id),
  trip_id uuid not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m double precision,
  recorded_at timestamptz not null default now(),
  foreign key (trip_id, org_id) references public.vehicle_trips (id, org_id) on delete cascade
);
create index on public.trip_points (trip_id, recorded_at);
alter table public.trip_points enable row level security;
-- Same people as the trip itself: the driver, admins and supervisors (trips_read).
create policy trip_points_read on public.trip_points for select to authenticated
  using (exists (select 1 from public.vehicle_trips t where t.id = trip_points.trip_id));
revoke all on public.trip_points from anon;
revoke insert, update, delete on public.trip_points from authenticated;

-- A route point is kept when the vehicle moved at least 25 m from the last kept point, so a parked
-- vehicle does not fill the table and GPS jitter does not add distance.
create or replace function private.add_trip_point(p_trip public.vehicle_trips, p_lat double precision, p_lng double precision, p_accuracy double precision)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_last public.trip_points;
  v_moved double precision;
begin
  if p_lat is null or p_lng is null then return; end if;
  select * into v_last from public.trip_points where trip_id = p_trip.id order by recorded_at desc limit 1;
  v_moved := case when v_last.id is null then null else private.distance_m(v_last.lat, v_last.lng, p_lat, p_lng) end;
  if v_last.id is null or v_moved >= 25 then
    insert into public.trip_points (org_id, trip_id, lat, lng, accuracy_m) values (p_trip.org_id, p_trip.id, p_lat, p_lng, p_accuracy);
    update public.vehicle_trips set distance_m = distance_m + coalesce(v_moved, 0) where id = p_trip.id;
  end if;
end $$;

drop function public.start_trip(text, text, double precision, double precision, double precision);
create function public.start_trip(
  p_code text, p_scan_method text, p_from_area uuid, p_to_area uuid,
  p_lat double precision default null, p_lng double precision default null, p_accuracy_m double precision default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_org uuid := private.my_org();
  v_vehicle uuid;
  v_trip public.vehicle_trips;
begin
  if not private.is_driver() then raise exception 'Only a driver can start a trip'; end if;
  if p_scan_method not in ('camera', 'typed') then raise exception 'Not allowed'; end if;
  if ((select count(*) from public.areas a where a.org_id = v_org and a.active and a.id in (p_from_area, p_to_area))
      <> (case when p_from_area = p_to_area then 1 else 2 end)) then
    raise exception 'Choose where the trip starts and where it goes';
  end if;
  select v.id into v_vehicle from public.vehicles v
  where v.org_id = v_org and v.active and v.qr_code = trim(p_code) and length(trim(p_code)) between 16 and 80
  for update;
  if v_vehicle is null then raise exception 'Vehicle code not recognised'; end if;

  -- A trip left running on an earlier day is closed at its last known time.
  update public.vehicle_trips t set status = 'completed', ended_at = coalesce(t.last_seen_at, t.started_at)
  where t.status = 'in_progress' and (t.driver_id = v_me or t.vehicle_id = v_vehicle)
    and coalesce(t.last_seen_at, t.started_at) < now() - interval '12 hours';

  select * into v_trip from public.vehicle_trips t where t.status = 'in_progress' and t.driver_id = v_me;
  if found then
    if v_trip.vehicle_id = v_vehicle then return v_trip.id; end if; -- repeat scan: same trip
    raise exception 'You already have a trip running';
  end if;
  if exists (select 1 from public.vehicle_trips t where t.status = 'in_progress' and t.vehicle_id = v_vehicle) then
    raise exception 'This vehicle is already on a trip';
  end if;

  insert into public.vehicle_trips (org_id, vehicle_id, driver_id, trip_date, status, started_at, is_simulated,
                                    from_area_id, to_area_id, last_lat, last_lng, last_accuracy_m, last_seen_at)
  select v_org, v_vehicle, v_me, (now() at time zone o.timezone)::date, 'in_progress', now(), false,
         p_from_area, p_to_area, p_lat, p_lng, p_accuracy_m, case when p_lat is not null then now() end
  from public.organizations o where o.id = v_org
  returning * into v_trip;
  insert into public.trip_events (org_id, trip_id, driver_id, type, lat, lng, accuracy_m, scan_method)
  values (v_org, v_trip.id, v_me, 'start', p_lat, p_lng, p_accuracy_m, p_scan_method);
  perform private.add_trip_point(v_trip, p_lat, p_lng, p_accuracy_m);
  return v_trip.id;
end $$;

create or replace function public.update_trip_position(
  p_trip uuid, p_lat double precision, p_lng double precision, p_accuracy_m double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_trip public.vehicle_trips;
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid position';
  end if;
  update public.vehicle_trips t
  set last_lat = p_lat, last_lng = p_lng, last_accuracy_m = greatest(p_accuracy_m, 0), last_seen_at = now()
  where t.id = p_trip and t.driver_id = auth.uid() and t.status = 'in_progress' and private.is_driver()
  returning * into v_trip;
  if v_trip.id is null then raise exception 'This trip has ended'; end if;
  perform private.add_trip_point(v_trip, p_lat, p_lng, p_accuracy_m);
end $$;

create or replace function public.end_trip(
  p_trip uuid, p_lat double precision default null, p_lng double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_trip public.vehicle_trips;
begin
  update public.vehicle_trips t set status = 'completed', ended_at = now()
  where t.id = p_trip and t.driver_id = auth.uid() and t.status = 'in_progress'
  returning * into v_trip;
  if v_trip.id is null then raise exception 'This trip has ended'; end if;
  insert into public.trip_events (org_id, trip_id, driver_id, type, lat, lng)
  values (v_trip.org_id, p_trip, auth.uid(), 'end', p_lat, p_lng);
  perform private.add_trip_point(v_trip, p_lat, p_lng, null);
end $$;

-- Live vehicles now also say where the trip started and where it is heading.
drop function public.get_live_vehicles();
create function public.get_live_vehicles()
returns table (trip_id uuid, vehicle_number text, vehicle_kind text, driver_first_name text,
               lat double precision, lng double precision, accuracy_m double precision,
               last_seen_at timestamptz, started_at timestamptz, is_mine boolean,
               from_area text, to_area text)
language sql stable security definer set search_path = '' as $$
  select t.id, v.number, v.kind,
         case when private.my_role() <> 'resident' then split_part(trim(u.name), ' ', 1) end,
         t.last_lat, t.last_lng, t.last_accuracy_m, t.last_seen_at, t.started_at, t.driver_id = auth.uid(),
         fa.name, ta.name
  from public.vehicle_trips t
  join public.vehicles v on v.id = t.vehicle_id
  join public.users u on u.id = t.driver_id
  left join public.areas fa on fa.id = t.from_area_id
  left join public.areas ta on ta.id = t.to_area_id
  where t.org_id = private.my_org() and private.my_role() is not null
    and t.status = 'in_progress' and t.last_lat is not null
    and t.last_seen_at > now() - interval '30 minutes'
  order by v.number
$$;

-- Trips of the last days for admins and supervisors: who drove what, from where to where, how far.
create or replace function public.get_trip_history(p_days int default 7)
returns table (trip_id uuid, vehicle_number text, driver_name text, from_area text, to_area text,
               status text, started_at timestamptz, ended_at timestamptz, distance_m double precision, points int)
language sql stable security definer set search_path = '' as $$
  select t.id, v.number, u.name, fa.name, ta.name, t.status, t.started_at, t.ended_at, t.distance_m,
         (select count(*)::int from public.trip_points p where p.trip_id = t.id)
  from public.vehicle_trips t
  join public.vehicles v on v.id = t.vehicle_id
  join public.users u on u.id = t.driver_id
  left join public.areas fa on fa.id = t.from_area_id
  left join public.areas ta on ta.id = t.to_area_id
  where t.org_id = private.my_org() and private.my_role() in ('admin', 'supervisor')
    and t.started_at > now() - make_interval(days => least(greatest(p_days, 1), 60))
  order by t.started_at desc
$$;

revoke all on function private.org_today(), private.add_trip_point(public.vehicle_trips, double precision, double precision, double precision) from public;
revoke all on function public.check_in(uuid), public.set_worker_area(uuid, uuid),
  public.create_duties(uuid, uuid, uuid, text, date[], time, time), public.cancel_duty(uuid),
  public.start_duty(uuid, double precision, double precision),
  public.complete_duty(uuid, text, text, double precision, double precision),
  public.start_trip(text, text, uuid, uuid, double precision, double precision, double precision),
  public.get_live_vehicles(), public.get_trip_history(int) from public, anon;
grant execute on function public.check_in(uuid), public.set_worker_area(uuid, uuid),
  public.create_duties(uuid, uuid, uuid, text, date[], time, time), public.cancel_duty(uuid),
  public.start_duty(uuid, double precision, double precision),
  public.complete_duty(uuid, text, text, double precision, double precision),
  public.start_trip(text, text, uuid, uuid, double precision, double precision, double precision),
  public.get_live_vehicles(), public.get_trip_history(int) to authenticated;
