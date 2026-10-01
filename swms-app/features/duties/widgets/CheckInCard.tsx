"use client";

// "Where are you working now?" — the worker's current block / area for today (1100).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPinned } from "lucide-react";
import { formatDateTime } from "@/lib/time";
import { checkIn } from "../actions";
import type { CheckIn } from "../schema";

export function CheckInCard({ current, areas, homeAreaName }: { current: CheckIn | null; areas: { id: string; name: string }[]; homeAreaName: string | null }) {
  const router = useRouter();
  const [areaId, setAreaId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !areaId) return setError(areaId ? undefined : "Choose your work area.");
    setBusy(true);
    setError(undefined);
    try {
      const result = await checkIn(areaId);
      if (result.ok) { setAreaId(""); router.refresh(); }
      else setError(result.message);
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="checkin-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
      <h2 id="checkin-title" className="flex items-center gap-2 text-lg font-bold text-leaf-950">
        <MapPinned className="size-5 text-leaf-700" aria-hidden /> Working now in
      </h2>
      <p role="status" className="mt-1 text-ui text-leaf-950">
        {current ? <><strong>{current.areaName}</strong> <span className="text-leaf-950/70">since {formatDateTime(current.at)}</span></> : "Not set today."}
      </p>
      {homeAreaName && <p className="mt-0.5 text-sm text-leaf-950/70">Your assigned area: {homeAreaName}</p>}
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-leaf-950">
          {current ? "Moved to another block?" : "Which block / area are you working in?"}
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="h-11 rounded-xl border border-leaf-300 bg-white px-3 text-base font-normal text-leaf-950">
            <option value="" disabled>Choose…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-full border border-leaf-300 bg-white px-5 text-ui font-semibold text-leaf-900 hover:bg-leaf-50 disabled:opacity-60">
          {busy ? "Saving…" : "Update"}
        </button>
      </form>
      <div role="alert">{error && <p className="mt-1 text-sm font-medium text-danger">{error}</p>}</div>
    </section>
  );
}
