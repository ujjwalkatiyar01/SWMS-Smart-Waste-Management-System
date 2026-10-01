import "server-only";
import { getStaffContext } from "@/features/staff/server";

export async function getAdminSetup() {
  const { db, me } = await getStaffContext(["admin"]);
  const [org, areas, locations, people, vehicles, schedules, roster] = await Promise.all([
    db.from("organizations").select("id, name, timezone, deadline_hours_json, escalation_after_hours, escalation_level2_after_hours, reopen_window_days, no_reply_hours, recurrence_threshold, recurrence_window_days, daily_report_limit, max_open_pickups, far_from_site_m, segregation_policy, segregation_warn_threshold, segregation_warn_window_days, morning_slot_end, afternoon_slot_end").eq("id", me.orgId).single(),
    db.from("areas").select("id, name, active").order("name"),
    db.from("locations").select("id, name, kind, area_id, address, lat, lng, active").order("name"),
    db.from("users").select("id, name, email, role, active, staff_id, worker_type, area_id").order("name"),
    db.from("vehicles").select("id, number, kind, default_driver_id, active").order("number"),
    db.from("collection_schedules").select("id, area_id, days_of_week, start_time, end_time, waste_type, vehicle_id, driver_id, active").order("created_at", { ascending: false }),
    db.from("staff_roster").select("id, staff_id, email, role, worker_type, claimed_by, claimed_at").order("staff_id"),
  ]);
  if (org.error || areas.error || locations.error || people.error || vehicles.error || schedules.error || roster.error)
    throw new Error("Could not load admin setup");
  return { org: org.data, areas: areas.data, locations: locations.data,
    people: people.data, vehicles: vehicles.data, schedules: schedules.data, roster: roster.data };
}
