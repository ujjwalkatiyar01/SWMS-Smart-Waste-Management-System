"use client";

// Admin plans a duty (1100): worker, work area, place (heavy-waste spots first), task, shift and days.
// One duty is created per chosen day; choosing the same shift again for a day adds nothing.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { formatDay, orgDay } from "@/lib/time";
import { createDuties } from "../actions";
import type { DutyFormOptions } from "../schema";

const field = "h-11 w-full rounded-xl border border-leaf-300 bg-white px-3 text-base text-leaf-950";
const label = "flex flex-col gap-1 text-sm font-semibold text-leaf-950";
const TYPE = { collector: "Waste collector", driver: "Driver" } as Record<string, string>;

export function DutyForm({ options }: { options: DutyFormOptions }) {
  const router = useRouter();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => orgDay(i)), []);
  const [workerId, setWorkerId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [task, setTask] = useState("");
  const [start, setStart] = useState("07:00");
  const [end, setEnd] = useState("11:00");
  const [dates, setDates] = useState<string[]>([days[0]]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const places = options.places.filter((p) => !areaId || p.areaId === areaId || p.areaId === null);

  function chooseWorker(id: string) {
    setWorkerId(id);
    const home = options.workers.find((w) => w.id === id)?.areaId;
    if (home && !areaId) setAreaId(home);
  }
  function toggle(day: string) {
    setDates((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const answer = await createDuties({ workerId, areaId, locationId: locationId || null, task, dates, start, end });
      if (answer.ok) {
        setResult({ ok: true, text: answer.created ? `${answer.created} duty ${answer.created === 1 ? "day" : "days"} added. The worker is notified.` : "These shifts already exist; nothing new was added." });
        setTask("");
        router.refresh();
      } else setResult({ ok: false, text: answer.message });
    } catch {
      setResult({ ok: false, text: "Could not save. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={label}>Worker
          <select value={workerId} onChange={(e) => chooseWorker(e.target.value)} required className={field}>
            <option value="" disabled>Choose…</option>
            {options.workers.map((w) => <option key={w.id} value={w.id}>{w.name}{w.workerType ? ` · ${TYPE[w.workerType]}` : ""}</option>)}
          </select>
        </label>
        <label className={label}>Work area
          <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setLocationId(""); }} required className={field}>
            <option value="" disabled>Choose…</option>
            {options.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className={label}>Place (heavy waste first)
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={field}>
            <option value="">Whole area</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.risk !== null ? ` · risk ${p.risk}` : ""}{p.open ? ` · ${p.open} open` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>Task
        <textarea value={task} onChange={(e) => setTask(e.target.value)} required minLength={3} maxLength={500} rows={2}
          placeholder="e.g. Empty all bins at Market Lane and sweep the drain side"
          className="rounded-xl border border-leaf-300 bg-white px-3 py-2 text-base font-normal text-leaf-950" />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <label className={label}>Shift starts<input type="time" value={start} onChange={(e) => setStart(e.target.value)} required className={field} /></label>
        <label className={label}>Shift ends<input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required className={field} /></label>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold text-leaf-950">Days ({dates.length} chosen)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {days.map((d, i) => (
            <label key={d} className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf-600 ${dates.includes(d) ? "border-leaf-700 bg-leaf-100 text-leaf-900" : "border-leaf-200 bg-white text-leaf-950/80"}`}>
              <input type="checkbox" className="sr-only" checked={dates.includes(d)} onChange={() => toggle(d)} />
              {i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatDay(d)}
            </label>
          ))}
        </div>
        <button type="button" onClick={() => setDates(days.slice(0, 7))} className="mt-2 min-h-11 text-sm font-semibold text-leaf-800 underline underline-offset-4">
          Choose the next 7 days
        </button>
      </fieldset>
      <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800 disabled:opacity-60">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Assign duty
      </button>
      <p role="status" className={`text-sm font-medium ${result?.ok ? "text-success" : "text-danger"}`}>{result?.text}</p>
    </form>
  );
}
