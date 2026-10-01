import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { addArea, addLocation, addSchedule, addStaff, addStaffId, addVehicle, regenerateQr, removeStaffId, saveSettings,
  setScheduleActive, setStaffActive, setWorkerArea, updateArea, updateLocation, updateVehicle } from "../actions";
import type { getAdminSetup } from "../server";
import { SetupForm } from "../widgets/SetupForm";

type Data = Awaited<ReturnType<typeof getAdminSetup>>;
const input = "h-11 w-full rounded-xl border border-leaf-300 bg-white px-3 text-base text-leaf-950";
const label = "flex flex-col gap-1 text-sm font-semibold text-leaf-950";
const numbers = [
  ["escalation_after_hours", "Escalation to supervisor (hours)"],
  ["escalation_level2_after_hours", "Escalation to higher authority (hours)"],
  ["reopen_window_days", "Reopen window (days)"],
  ["no_reply_hours", "No-reply period (hours)"],
  ["recurrence_threshold", "Repeat-incident threshold"],
  ["recurrence_window_days", "Repeat-incident window (days)"],
  ["daily_report_limit", "Daily reports per resident"],
  ["max_open_pickups", "Open pickups per resident"],
  ["far_from_site_m", "Far-from-site warning (metres)"],
  ["segregation_warn_threshold", "Segregation warning threshold"],
  ["segregation_warn_window_days", "Segregation warning window (days)"],
] as const;
const WORKER_TYPE = { collector: "Waste collector", driver: "Driver" } as Record<string, string>;
const deadlines = [
  ["overflowing_bin", "Overflowing bin"], ["garbage_on_road", "Garbage on road"],
  ["missed_collection", "Missed collection"], ["illegal_dumping", "Illegal dumping"],
  ["improper_segregation", "Improper segregation"], ["other", "Other"],
] as const;

export function SetupPage({ data }: { data: Data }) {
  const org = data.org;
  const hours = org.deadline_hours_json as Record<string, number>;
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 px-4 py-8 sm:px-6">
    <header>
      <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 font-semibold text-leaf-800"><ArrowLeft className="size-4" aria-hidden /> Dashboard</Link>
      <p className="eyebrow mt-3 text-leaf-600">Admin</p>
      <h1 className="mt-1 text-3xl font-extrabold text-leaf-950">Organisation setup</h1>
      <p className="mt-2 text-ui text-leaf-950/80">Settings and records for {org.name}. Changes are kept in the audit history.</p>
      <nav aria-label="Setup sections" className="mt-5 flex flex-wrap gap-2 text-sm font-semibold text-leaf-800">
        <a href="#settings" className="rounded-full bg-leaf-100 px-4 py-2">Settings</a>
        <a href="#areas" className="rounded-full bg-leaf-100 px-4 py-2">Areas</a>
        <a href="#places" className="rounded-full bg-leaf-100 px-4 py-2">Places</a>
        <a href="#people" className="rounded-full bg-leaf-100 px-4 py-2">People</a>
        <a href="#staff-ids" className="rounded-full bg-leaf-100 px-4 py-2">Staff IDs</a>
        <a href="#vehicles" className="rounded-full bg-leaf-100 px-4 py-2">Vehicles</a>
        <a href="#schedules" className="rounded-full bg-leaf-100 px-4 py-2">Schedules</a>
      </nav>
    </header>

    <section id="settings" aria-labelledby="settings-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="settings-title" className="text-2xl font-bold text-leaf-950">Settings</h2>
      <SetupForm action={saveSettings} submitLabel="Save settings" className="mt-6 flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={label}>Time zone
            <input name="timezone" className={input} defaultValue={org.timezone} required />
          </label>
          <label className={label}>Segregation policy
            <select name="segregation_policy" className={input} defaultValue={org.segregation_policy}>
              <option value="collect_educate">Collect and educate</option>
              <option value="warn_escalate">Warn, then escalate</option>
              <option value="refuse_allowed">Refusal allowed with photo and reason</option>
            </select>
          </label>
          {numbers.map(([key, title]) => <label key={key} className={label}>{title}
            <input type="number" min={1} max={720} name={key} className={input} defaultValue={org[key]} required />
          </label>)}
          <label className={label}>Morning slot ends
            <input type="time" name="morning_slot_end" className={input} defaultValue={org.morning_slot_end.slice(0, 5)} required />
          </label>
          <label className={label}>Afternoon slot ends
            <input type="time" name="afternoon_slot_end" className={input} defaultValue={org.afternoon_slot_end.slice(0, 5)} required />
          </label>
        </div>
        <div>
          <h3 className="text-lg font-bold text-leaf-950">Issue deadlines (hours)</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deadlines.map(([key, title]) => <label key={key} className={label}>{title}
              <input type="number" min={1} max={720} name={key} className={input} defaultValue={hours[key]} required />
            </label>)}
          </div>
        </div>
      </SetupForm>
    </section>

    <section id="areas" aria-labelledby="areas-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="areas-title" className="text-2xl font-bold text-leaf-950">Areas</h2>
      <p className="mt-1 text-sm text-leaf-950/70">Deactivate an area to keep its history while preventing new use.</p>
      <SetupForm action={addArea} submitLabel="Add area" className="mt-5 flex flex-wrap items-end gap-3">
        <label className={`${label} min-w-60 flex-1`}>New area name<input name="name" className={input} required maxLength={80} /></label>
      </SetupForm>
      <ul className="mt-6 divide-y divide-leaf-100">
        {data.areas.map((area) => <li key={area.id} className="py-3">
          <SetupForm action={updateArea} submitLabel="Save area" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={area.id} />
            <label className={`${label} min-w-60 flex-1`}>Area name<input name="name" className={input} defaultValue={area.name} required maxLength={80} /></label>
            <label className={label}>Status
              <select name="active" className={input} defaultValue={area.active ? "true" : "false"}>
                <option value="true">Active</option><option value="false">Inactive</option>
              </select>
            </label>
          </SetupForm>
        </li>)}
      </ul>
    </section>

    <section id="places" aria-labelledby="places-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="places-title" className="text-2xl font-bold text-leaf-950">Locations and disposal sites</h2>
      <p className="mt-1 text-sm text-leaf-950/70">Use an address or a map coordinate pair. A random printed code is created for each place.</p>
      <Link href="/admin/setup/qr" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-leaf-300 px-5 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">Open printable QR sheet</Link>
      <SetupForm action={addLocation} submitLabel="Add place" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>Place name<input name="name" className={input} required maxLength={100} /></label>
        <label className={label}>Kind<select name="kind" className={input}><option value="bin">Bin</option><option value="spot">Waste spot</option><option value="disposal_site">Disposal site</option></select></label>
        <label className={label}>Area<select name="areaId" className={input}><option value="">Choose area</option>{data.areas.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className={label}>Address<input name="address" className={input} maxLength={300} /></label>
        <label className={label}>Latitude<input name="lat" type="number" step="any" min={-90} max={90} className={input} /></label>
        <label className={label}>Longitude<input name="lng" type="number" step="any" min={-180} max={180} className={input} /></label>
      </SetupForm>
      <ul className="mt-6 divide-y divide-leaf-100">
        {data.locations.map((place) => <li key={place.id} className="py-4">
          <SetupForm action={updateLocation} submitLabel="Save place" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input type="hidden" name="id" value={place.id} />
            <label className={label}>Place name<input name="name" className={input} defaultValue={place.name} required maxLength={100} /></label>
            <label className={label}>Kind<select name="kind" className={input} defaultValue={place.kind}><option value="bin">Bin</option><option value="spot">Waste spot</option><option value="disposal_site">Disposal site</option></select></label>
            <label className={label}>Area<select name="areaId" className={input} defaultValue={place.area_id ?? ""}><option value="">No area</option>{data.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className={label}>Address<input name="address" className={input} defaultValue={place.address ?? ""} maxLength={300} /></label>
            <label className={label}>Latitude<input name="lat" type="number" step="any" min={-90} max={90} className={input} defaultValue={place.lat ?? ""} /></label>
            <label className={label}>Longitude<input name="lng" type="number" step="any" min={-180} max={180} className={input} defaultValue={place.lng ?? ""} /></label>
            <label className={label}>Status<select name="active" className={input} defaultValue={place.active ? "true" : "false"}><option value="true">Active</option><option value="false">Inactive</option></select></label>
          </SetupForm>
          <SetupForm action={regenerateQr} submitLabel="Regenerate printed code" className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={place.id} />
          </SetupForm>
        </li>)}
      </ul>
    </section>

    <section id="people" aria-labelledby="people-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="people-title" className="text-2xl font-bold text-leaf-950">People</h2>
      <p className="mt-2 text-sm text-leaf-950/80">Workers and supervisors get an invite email with a link to set their password. Deactivating someone returns their open work to you.</p>
      <SetupForm action={addStaff} submitLabel="Send invite" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>Full name<input name="name" className={input} required minLength={2} maxLength={80} autoComplete="off" /></label>
        <label className={label}>Email<input name="email" type="email" className={input} required maxLength={254} autoComplete="off" /></label>
        <label className={label}>Role<select name="role" className={input} defaultValue="worker"><option value="worker">Worker</option><option value="supervisor">Supervisor</option></select></label>
        <label className={label}>Type of work (workers)<select name="workerType" className={input} defaultValue="collector"><option value="collector">Waste collector</option><option value="driver">Driver</option></select></label>
        <label className={label}>Area (optional)<select name="areaId" className={input} defaultValue=""><option value="">None</option>{data.areas.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      </SetupForm>
      <ul className="mt-6 divide-y divide-leaf-100">
        {data.people.filter((p) => p.role !== "resident").map((person) => <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-leaf-950">
            <strong>{person.name}</strong> · {person.role === "worker" && person.worker_type ? WORKER_TYPE[person.worker_type] : { worker: "Worker", supervisor: "Supervisor", admin: "Admin", higher_authority: "Higher authority", resident: "Resident" }[person.role]} · {person.email}{person.staff_id && <> · <span className="font-mono">{person.staff_id}</span></>}
            <span className={person.active ? "ml-2 rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success" : "ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger"}>{person.active ? "Active" : "Inactive"}</span>
          </p>
          {person.role === "worker" && person.active && <SetupForm action={setWorkerArea} submitLabel="Save area" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={person.id} />
            <label className="sr-only" htmlFor={`area-${person.id}`}>Work area of {person.name}</label>
            <select id={`area-${person.id}`} name="areaId" defaultValue={person.area_id ?? ""} className="h-11 rounded-xl border border-leaf-300 bg-white px-3 text-sm text-leaf-950">
              <option value="" disabled>Work area…</option>
              {data.areas.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </SetupForm>}
          {(person.role === "worker" || person.role === "supervisor") && <SetupForm action={setStaffActive} submitLabel={person.active ? "Deactivate" : "Reactivate"} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={person.id} /><input type="hidden" name="active" value={person.active ? "false" : "true"} />
          </SetupForm>}
        </li>)}
      </ul>
      <p className="mt-4 text-sm text-leaf-950/70">{data.people.filter((p) => p.role === "resident").length} residents are registered. Residents sign up themselves.</p>
    </section>

    <section id="staff-ids" aria-labelledby="staff-ids-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="staff-ids-title" className="text-2xl font-bold text-leaf-950">Staff IDs for sign-up</h2>
      <p className="mt-2 text-sm text-leaf-950/80">A worker or administrator can create their own account only with a staff ID and work email listed here. Their role and type of work come from this list. Each ID can be used once. This list is your organisation&apos;s own record; it is not connected to a government database.</p>
      <SetupForm action={addStaffId} submitLabel="Add staff ID" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>Staff ID<input name="staffId" className={`${input} font-mono uppercase`} required pattern="[A-Za-z0-9\-]{3,40}" maxLength={40} autoComplete="off" /></label>
        <label className={label}>Work email<input name="email" type="email" className={input} required maxLength={254} autoComplete="off" /></label>
        <label className={label}>Role<select name="role" className={input} defaultValue="worker"><option value="worker">Worker</option><option value="admin">Administrator</option></select></label>
        <label className={label}>Type of work (workers)<select name="workerType" className={input} defaultValue="collector"><option value="collector">Waste collector</option><option value="driver">Driver</option></select></label>
      </SetupForm>
      <ul className="mt-6 divide-y divide-leaf-100">
        {data.roster.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-leaf-950">
            <strong className="font-mono">{entry.staff_id}</strong> · {entry.role === "admin" ? "Administrator" : WORKER_TYPE[entry.worker_type ?? ""]} · {entry.email}
            <span className={entry.claimed_by ? "ml-2 rounded-full bg-success-soft px-2 py-0.5 text-xs font-bold text-success" : "ml-2 rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-bold text-leaf-800"}>{entry.claimed_by ? "Account created" : "Not used yet"}</span>
          </p>
          {!entry.claimed_by && <SetupForm action={removeStaffId} submitLabel="Remove" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={entry.id} />
          </SetupForm>}
        </li>)}
      </ul>
      {data.roster.length === 0 && <p className="mt-4 text-sm text-leaf-950/70">No staff IDs yet. Add one so a worker or administrator can sign up.</p>}
    </section>

    <section id="vehicles" aria-labelledby="vehicles-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="vehicles-title" className="text-2xl font-bold text-leaf-950">Vehicles</h2>
      <p className="mt-2 text-sm text-leaf-950/80">Each vehicle has a QR code. A driver scans it to start a trip and share the vehicle&apos;s position. <Link href="/admin/setup/qr#vehicles" className="font-semibold text-leaf-800 underline">Print vehicle QR codes</Link></p>
      <SetupForm action={addVehicle} submitLabel="Add vehicle" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={label}>Number<input name="number" className={input} required maxLength={40} /></label>
        <label className={label}>Type<select name="kind" className={input}><option value="truck">Truck</option><option value="e-rickshaw">E-rickshaw</option><option value="cart">Cart</option><option value="other">Other</option></select></label>
        <label className={label}>Default driver<select name="driverId" className={input}><option value="">Choose later</option>{data.people.filter((p) => p.role === "worker" && p.active && p.worker_type !== "collector").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </SetupForm>
      <ul className="mt-6 divide-y divide-leaf-100">
        {data.vehicles.map((vehicle) => <li key={vehicle.id} className="py-3">
          <SetupForm action={updateVehicle} submitLabel="Save vehicle" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="id" value={vehicle.id} />
            <label className={label}>Number<input name="number" className={input} defaultValue={vehicle.number} required maxLength={40} /></label>
            <label className={label}>Type<select name="kind" className={input} defaultValue={vehicle.kind}><option value="truck">Truck</option><option value="e-rickshaw">E-rickshaw</option><option value="cart">Cart</option><option value="other">Other</option></select></label>
            <label className={label}>Default driver<select name="driverId" className={input} defaultValue={vehicle.default_driver_id ?? ""}><option value="">None</option>{data.people.filter((p) => p.role === "worker" && p.active && p.worker_type !== "collector").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className={label}>Status<select name="active" className={input} defaultValue={vehicle.active ? "true" : "false"}><option value="true">Active</option><option value="false">Inactive</option></select></label>
          </SetupForm>
        </li>)}
      </ul>
    </section>

    <section id="schedules" aria-labelledby="schedules-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
      <h2 id="schedules-title" className="text-2xl font-bold text-leaf-950">Routine collection schedules</h2>
      <SetupForm action={addSchedule} submitLabel="Add schedule" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>Area<select name="areaId" className={input} required defaultValue=""><option value="" disabled>Choose area</option>{data.areas.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label className={label}>Start<input type="time" name="start" className={input} required /></label>
        <label className={label}>End<input type="time" name="end" className={input} required /></label>
        <label className={label}>Waste type<select name="wasteType" className={input}><option value="mixed">Mixed</option><option value="wet">Wet</option><option value="dry">Dry</option></select></label>
        <label className={label}>Vehicle<select name="vehicleId" className={input}><option value="">Choose later</option>{data.vehicles.filter((v) => v.active).map((v) => <option key={v.id} value={v.id}>{v.number}</option>)}</select></label>
        <label className={label}>Driver<select name="driverId" className={input}><option value="">Choose later</option>{data.people.filter((p) => p.role === "worker" && p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <fieldset className="sm:col-span-2 lg:col-span-3"><legend className="text-sm font-semibold text-leaf-950">Days of week</legend><div className="mt-2 flex flex-wrap gap-4">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label key={day} className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" name="days" value={index} />{day}</label>)}</div></fieldset>
      </SetupForm>
      <ul className="mt-6 divide-y divide-leaf-100">
        {data.schedules.map((schedule) => <li key={schedule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <p className="text-sm text-leaf-950"><strong>{data.areas.find((a) => a.id === schedule.area_id)?.name ?? "Area"}</strong> · {schedule.days_of_week.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)} · {schedule.waste_type}</p>
          <SetupForm action={setScheduleActive} submitLabel={schedule.active ? "Deactivate" : "Reactivate"} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={schedule.id} /><input type="hidden" name="active" value={schedule.active ? "false" : "true"} />
          </SetupForm>
        </li>)}
      </ul>
    </section>
  </div>;
}
