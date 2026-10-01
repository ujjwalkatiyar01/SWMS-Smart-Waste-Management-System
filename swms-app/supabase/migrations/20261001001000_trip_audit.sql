-- 1000 — Keep the setup audit history readable: a driver's position (0900) changes every ~15 s, so
-- updates that only move last_lat / last_lng / last_accuracy_m / last_seen_at are not audited.
-- Planning, start, end and every other trip change still are (0004 audit_trips).

drop trigger audit_trips on public.vehicle_trips;
create trigger audit_trips_insert_delete after insert or delete on public.vehicle_trips
  for each row execute function private.audit_setup();
create trigger audit_trips_update after update of
  org_id, vehicle_id, driver_id, trip_date, status, started_at, ended_at, is_simulated,
  schedule_id, disposal_site_id, disposal_check, unapproved_stop_count
  on public.vehicle_trips
  for each row execute function private.audit_setup();
