-- 0900 — Live vehicle tracking from the driver's phone (user decision 2026-10-01; 03 F7 trips).
-- A driver scans the vehicle's printed QR code to start a trip; while it runs the phone sends its GPS
-- position. Only the latest position is kept (no route history). Positions come from a phone, not a
-- vehicle tracker, and the screens say so.

-- Printed vehicle code: a random token, hidden from clients like locations.qr_code (04 G1).
alter table public.vehicles add column qr_code text unique default replace(gen_random_uuid()::text, '-', '');
revoke select on public.vehicles from authenticated;
grant select (id, org_id, number, kind, default_driver_id, active, created_at) on public.vehicles to authenticated;

alter table public.vehicle_trips
  add column last_lat double precision check (last_lat between -90 and 90),
  add column last_lng double precision check (last_lng between -180 and 180),
  add column last_accuracy_m double precision check (last_accuracy_m >= 0),
  add column last_seen_at timestamptz;

-- One running trip per vehicle and per driver.
create unique index vehicle_trips_one_running_vehicle on public.vehicle_trips (vehicle_id) where status = 'in_progress';
create unique index vehicle_trips_one_running_driver on public.vehicle_trips (driver_id) where status = 'in_progress';

create or replace function private.is_driver() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users u
                 where u.id = auth.uid() and u.active and u.role = 'worker' and u.worker_type = 'driver')
$$;

create or replace function public.start_trip(
  p_code text, p_scan_method text,
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
                                    last_lat, last_lng, last_accuracy_m, last_seen_at)
  select v_org, v_vehicle, v_me, (now() at time zone o.timezone)::date, 'in_progress', now(), false,
         p_lat, p_lng, p_accuracy_m, case when p_lat is not null then now() end
  from public.organizations o where o.id = v_org
  returning * into v_trip;
  insert into public.trip_events (org_id, trip_id, driver_id, type, lat, lng, accuracy_m, scan_method)
  values (v_org, v_trip.id, v_me, 'start', p_lat, p_lng, p_accuracy_m, p_scan_method);
  return v_trip.id;
end $$;

create or replace function public.update_trip_position(
  p_trip uuid, p_lat double precision, p_lng double precision, p_accuracy_m double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid position';
  end if;
  update public.vehicle_trips t
  set last_lat = p_lat, last_lng = p_lng, last_accuracy_m = greatest(p_accuracy_m, 0), last_seen_at = now()
  where t.id = p_trip and t.driver_id = auth.uid() and t.status = 'in_progress' and private.is_driver();
  if not found then raise exception 'This trip has ended'; end if;
end $$;

create or replace function public.end_trip(
  p_trip uuid, p_lat double precision default null, p_lng double precision default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_org uuid;
begin
  update public.vehicle_trips t set status = 'completed', ended_at = now()
  where t.id = p_trip and t.driver_id = auth.uid() and t.status = 'in_progress'
  returning t.org_id into v_org;
  if v_org is null then raise exception 'This trip has ended'; end if;
  insert into public.trip_events (org_id, trip_id, driver_id, type, lat, lng)
  values (v_org, p_trip, auth.uid(), 'end', p_lat, p_lng);
end $$;

-- Running vehicles in the caller's organisation with a position from the last 30 minutes.
-- Residents get the vehicle and its position only; staff also see the driver's first name.
create or replace function public.get_live_vehicles()
returns table (trip_id uuid, vehicle_number text, vehicle_kind text, driver_first_name text,
               lat double precision, lng double precision, accuracy_m double precision,
               last_seen_at timestamptz, started_at timestamptz, is_mine boolean)
language sql stable security definer set search_path = '' as $$
  select t.id, v.number, v.kind,
         case when private.my_role() <> 'resident' then split_part(trim(u.name), ' ', 1) end,
         t.last_lat, t.last_lng, t.last_accuracy_m, t.last_seen_at, t.started_at, t.driver_id = auth.uid()
  from public.vehicle_trips t
  join public.vehicles v on v.id = t.vehicle_id
  join public.users u on u.id = t.driver_id
  where t.org_id = private.my_org() and private.my_role() is not null
    and t.status = 'in_progress' and t.last_lat is not null
    and t.last_seen_at > now() - interval '30 minutes'
  order by v.number
$$;

create or replace function public.get_vehicle_qr_sheet()
returns table (id uuid, number text, kind text, qr_code text)
language sql stable security definer set search_path = '' as $$
  select v.id, v.number, v.kind, v.qr_code from public.vehicles v
  where v.org_id = private.my_org() and private.my_role() = 'admin' and v.active
  order by v.number
$$;

revoke all on function private.is_driver() from public;
revoke all on function public.start_trip(text, text, double precision, double precision, double precision),
  public.update_trip_position(uuid, double precision, double precision, double precision),
  public.end_trip(uuid, double precision, double precision),
  public.get_live_vehicles(), public.get_vehicle_qr_sheet() from public, anon;
grant execute on function public.start_trip(text, text, double precision, double precision, double precision),
  public.update_trip_position(uuid, double precision, double precision, double precision),
  public.end_trip(uuid, double precision, double precision),
  public.get_live_vehicles(), public.get_vehicle_qr_sheet() to authenticated;
