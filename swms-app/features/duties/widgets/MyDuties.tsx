"use client";

// The worker's duties (1100): today's first, then the coming days. Start on the day (GPS saved),
// then finish with an after-photo and a short note.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, MapPin, Play } from "lucide-react";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { formatDateTime, formatDay } from "@/lib/time";
import { completeDuty, startDuty } from "../actions";
import type { Duty } from "../schema";
import { DutyStatusBadge } from "./DutyStatusBadge";

function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => resolve(null), {
      enableHighAccuracy: true,
      timeout: 8000,
    });
  });
}

export function MyDuties({ duties }: { duties: Duty[] }) {
  const today = duties.filter((d) => d.isToday);
  const other = duties.filter((d) => !d.isToday);
  return (
    <section aria-labelledby="duties-title" className="flex flex-col gap-4">
      <div>
        <h2 id="duties-title" className="text-xl font-bold text-leaf-950">My duties</h2>
        <p className="mt-1 text-sm text-leaf-950/80">Set by your admin: where to work, what to do and when.</p>
      </div>
      {today.length ? (
        <ul className="flex flex-col gap-3">{today.map((d) => <DutyCard key={d.id} duty={d} />)}</ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-leaf-300 px-4 py-6 text-center text-ui text-leaf-950/80">No duty for today.</p>
      )}
      {other.length > 0 && (
        <>
          <h3 className="text-base font-bold text-leaf-950">Other days</h3>
          <ul className="flex flex-col gap-3">{other.map((d) => <DutyCard key={d.id} duty={d} />)}</ul>
        </>
      )}
    </section>
  );
}

function DutyCard({ duty }: { duty: Duty }) {
  return (
    <li className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-leaf-900">
          <CalendarClock className="size-4" aria-hidden /> {duty.isToday ? "Today" : formatDay(duty.date)} · {duty.start}–{duty.end}
        </p>
        <DutyStatusBadge status={duty.status} />
      </div>
      <p className="mt-2 text-ui font-semibold text-leaf-950">{duty.task}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-leaf-950/80">
        <MapPin className="size-4 text-leaf-700" aria-hidden /> {[duty.placeName, duty.areaName].filter(Boolean).join(" · ")}
      </p>
      {duty.status === "scheduled" && duty.isToday && <StartButton dutyId={duty.id} />}
      {duty.status === "in_progress" && <FinishForm dutyId={duty.id} startedAt={duty.startedAt} />}
      {duty.status === "done" && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="size-4" aria-hidden /> Done {duty.doneAt ? formatDateTime(duty.doneAt) : ""}
          </p>
          {duty.doneNote && <p className="text-sm text-leaf-950/80">{duty.doneNote}</p>}
          {duty.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private photo
            <img src={duty.photoUrl} alt="After-photo of this duty" className="max-h-48 w-auto self-start rounded-xl" />
          )}
        </div>
      )}
      {duty.status === "missed" && <p className="mt-3 text-sm text-danger">This shift ended before it was started.</p>}
    </li>
  );
}

function StartButton({ dutyId }: { dutyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function start() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await startDuty({ dutyId, position: await currentPosition() });
      if (result.ok) router.refresh();
      else setError(result.message);
    } catch {
      setError("Could not start. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 flex flex-col gap-1">
      <button type="button" onClick={() => void start()} disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />} Start duty
      </button>
      <p className="text-sm text-leaf-950/70">Tap when you reach the place. Your location is saved with the start time.</p>
      <div role="alert">{error && <p className="text-sm font-medium text-danger">{error}</p>}</div>
    </div>
  );
}

function FinishForm({ dutyId, startedAt }: { dutyId: string; startedAt: string | null }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!photo) return setError("Add an after-photo of the place.");
    setBusy(true);
    setError(undefined);
    try {
      const body = new FormData();
      body.append("file", photo, "after.jpg");
      body.append("dutyId", dutyId);
      const upload = (await (await fetch("/api/duty-photo", { method: "POST", body })).json()) as { ok: boolean; path?: string; message?: string };
      if (!upload.ok || !upload.path) return setError(upload.message ?? "Photo upload failed. Please try again.");
      const result = await completeDuty({ dutyId, photoPath: upload.path, note, position: await currentPosition() });
      if (result.ok) router.refresh();
      else setError(result.message);
    } catch {
      setError("Could not send. Check your connection and try again — your note is kept.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={finish} noValidate className="mt-3 flex flex-col gap-3">
      {startedAt && <p className="text-sm text-leaf-950/80">Started {formatDateTime(startedAt)}</p>}
      <PhotoPicker id={`duty-photo-${dutyId}`} label="After-photo (required)" onChange={setPhoto} />
      <label className="flex flex-col gap-1 text-sm font-semibold text-leaf-950">
        Note (optional)
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000}
          className="rounded-2xl border border-leaf-900/15 bg-white px-4 py-3 text-base font-normal text-leaf-950" />
      </label>
      <div role="alert">{error && <p className="text-sm font-medium text-danger">{error}</p>}</div>
      <button type="submit" disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800 disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />} Mark duty done
      </button>
    </form>
  );
}
