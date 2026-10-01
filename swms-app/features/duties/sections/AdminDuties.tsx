// Admin duty roster (1100): plan duties, see one day's duties with status and after-photos, and where
// each worker said they are working today.

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { EmptyState } from "@/features/staff";
import { formatDateTime, formatDay, orgDay } from "@/lib/time";
import type { getAdminDuties } from "../server";
import { CancelDutyButton } from "../widgets/CancelDutyButton";
import { DutyForm } from "../widgets/DutyForm";
import { DutyStatusBadge } from "../widgets/DutyStatusBadge";

type Data = Awaited<ReturnType<typeof getAdminDuties>>;
const TYPE = { collector: "Waste collector", driver: "Driver" } as Record<string, string>;

function shift(day: string, by: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

export function AdminDuties({ data }: { data: Data }) {
  const done = data.duties.filter((d) => d.status === "done").length;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 font-semibold text-leaf-800"><ArrowLeft className="size-4" aria-hidden /> Dashboard</Link>
        <p className="eyebrow mt-3 text-leaf-600">Admin</p>
        <h1 className="mt-1 text-3xl font-extrabold text-leaf-950">Duty roster</h1>
        <p className="mt-2 text-ui text-leaf-950/80">Give each worker a place, a task and a shift. They start it on the day and finish it with an after-photo.</p>
      </header>

      <section aria-labelledby="plan-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
        <h2 id="plan-title" className="text-2xl font-bold text-leaf-950">Assign a duty</h2>
        <div className="mt-5"><DutyForm options={data.options} /></div>
      </section>

      <section aria-labelledby="day-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="day-title" className="text-2xl font-bold text-leaf-950">
            {data.day === orgDay() ? "Today" : formatDay(data.day)} · {done}/{data.duties.length} done
          </h2>
          <nav aria-label="Choose day" className="flex gap-2">
            <Link href={`/admin/duties?day=${shift(data.day, -1)}`} className="inline-flex size-11 items-center justify-center rounded-full border border-leaf-200 hover:bg-leaf-50" aria-label="Previous day"><ChevronLeft className="size-5" aria-hidden /></Link>
            <Link href="/admin/duties" className="inline-flex min-h-11 items-center rounded-full border border-leaf-200 px-4 text-sm font-semibold hover:bg-leaf-50">Today</Link>
            <Link href={`/admin/duties?day=${shift(data.day, 1)}`} className="inline-flex size-11 items-center justify-center rounded-full border border-leaf-200 hover:bg-leaf-50" aria-label="Next day"><ChevronRight className="size-5" aria-hidden /></Link>
          </nav>
        </div>
        {data.duties.length ? (
          <ul className="mt-5 divide-y divide-leaf-100">
            {data.duties.map((d) => (
              <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-leaf-900">
                    {d.start}–{d.end} · {d.workerName}{d.workerType ? ` (${TYPE[d.workerType]})` : ""} <DutyStatusBadge status={d.status} />
                  </p>
                  <p className="text-ui text-leaf-950">{d.task}</p>
                  <p className="text-sm text-leaf-950/70">{[d.placeName, d.areaName].filter(Boolean).join(" · ")}</p>
                  {d.startedAt && <p className="text-sm text-leaf-950/70">Started {formatDateTime(d.startedAt)}{d.doneAt ? ` · done ${formatDateTime(d.doneAt)}` : ""}</p>}
                  {d.doneNote && <p className="text-sm text-leaf-950/80">“{d.doneNote}”</p>}
                </div>
                {d.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private photo
                  <img src={d.photoUrl} alt={`After-photo from ${d.workerName}`} className="h-24 w-32 rounded-xl object-cover" />
                )}
                {d.status === "scheduled" && <CancelDutyButton dutyId={d.id} />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5"><EmptyState title="No duties on this day" hint="Assign one above." /></div>
        )}
      </section>

      <section aria-labelledby="checkins-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
        <h2 id="checkins-title" className="flex items-center gap-2 text-2xl font-bold text-leaf-950"><MapPinned className="size-6 text-leaf-700" aria-hidden /> Where workers are today</h2>
        <p className="mt-1 text-sm text-leaf-950/80">The block or area each worker gave at login or changed later today.</p>
        {data.checkIns.length ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {data.checkIns.map((c) => (
              <li key={`${c.workerName}-${c.at}`} className="rounded-xl border border-leaf-100 px-4 py-3 text-sm text-leaf-950">
                <strong>{c.workerName}</strong> · {c.areaName} <span className="text-leaf-950/70">since {formatDateTime(c.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-leaf-950/70">No worker has checked in today yet.</p>
        )}
      </section>
    </div>
  );
}
