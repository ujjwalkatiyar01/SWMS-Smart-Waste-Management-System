"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { uploadPickupPhoto } from "@/lib/photos/upload-pickup";
import { pickupTransition } from "../actions";
import type { PickupDetail } from "../schema";

const fieldClass = "h-11 w-full rounded-xl border border-leaf-300 bg-white px-3 text-base text-leaf-950";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-leaf-800 disabled:opacity-60";

export function PickupActions({ pickup }: { pickup: PickupDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [collectPhoto, setCollectPhoto] = useState<Blob | null>(null);
  const [refusePhoto, setRefusePhoto] = useState<Blob | null>(null);
  const isRequester = pickup.requesterId === pickup.viewerId;
  const isAdmin = pickup.viewerRole === "admin";
  const canCollect = pickup.status === "scheduled" && (isAdmin || (pickup.viewerRole === "worker" && pickup.assignedWorkerId === pickup.viewerId));

  async function run(kind: "cancel" | "schedule" | "reschedule" | "decline" | "collect" | "refuse", form?: HTMLFormElement) {
    if (busy) return;
    const data = form ? new FormData(form) : null;
    setBusy(true);
    setError(undefined);
    try {
      let photoPath: string | undefined;
      const chosenPhoto = kind === "collect" ? collectPhoto : kind === "refuse" ? refusePhoto : null;
      if (chosenPhoto) {
        const uploaded = await uploadPickupPhoto(chosenPhoto, pickup.id);
        if (!uploaded.ok) { setError(uploaded.message); return; }
        photoPath = uploaded.path;
      }
      if (kind === "refuse" && !photoPath) { setError("Choose a photo before refusing the pickup."); return; }
      const result = await pickupTransition({ kind, id: pickup.id,
        date: String(data?.get("date") ?? ""), slot: String(data?.get("slot") ?? ""),
        workerId: data?.get("workerId") ? String(data.get("workerId")) : null,
        reason: String(data?.get("reason") ?? ""),
        segregationOk: data?.get("segregationOk") === "yes" ? true : data?.get("segregationOk") === "no" ? false : undefined,
        photoPath,
      });
      if (result.ok) router.refresh();
      else setError(result.message);
    } catch {
      setError("Could not update this pickup. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(kind: "schedule" | "reschedule" | "decline" | "collect" | "refuse") {
    return (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void run(kind, event.currentTarget); };
  }

  if (!(isRequester && ["requested", "scheduled"].includes(pickup.status)) &&
      !(isAdmin && ["requested", "scheduled", "missed"].includes(pickup.status)) && !canCollect) return null;

  return (
    <section aria-labelledby="pickup-actions-title" className="flex flex-col gap-5 rounded-[1.75rem] border border-leaf-200 bg-leaf-50 p-5 sm:p-6">
      <h2 id="pickup-actions-title" className="text-xl font-bold text-leaf-950">Actions</h2>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      {isAdmin && ["requested", "missed", "scheduled"].includes(pickup.status) && (
        <form onSubmit={submit(pickup.status === "scheduled" ? "reschedule" : "schedule")} className="grid gap-3 sm:grid-cols-2">
          <h3 className="font-semibold text-leaf-950 sm:col-span-2">{pickup.status === "scheduled" ? "Reschedule" : "Schedule"} pickup</h3>
          <label className="flex flex-col gap-1 text-sm font-semibold">Date
            <input className={fieldClass} name="date" type="date" required defaultValue={pickup.preferredDate} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">Slot
            <select className={fieldClass} name="slot" defaultValue={pickup.slot} required>
              <option value="morning">Morning</option><option value="afternoon">Afternoon</option>
            </select>
          </label>
          {pickup.status !== "scheduled" && <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">Worker (optional)
            <select className={fieldClass} name="workerId" defaultValue="">
              <option value="">Assign later</option>
              {pickup.workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
            </select>
          </label>}
          <button className={`${buttonClass} sm:col-span-2`} disabled={busy} type="submit">{busy ? "Saving…" : pickup.status === "scheduled" ? "Save new time" : "Confirm schedule"}</button>
        </form>
      )}
      {isAdmin && pickup.status === "requested" && (
        <form onSubmit={submit("decline")} className="flex flex-col gap-2 border-t border-leaf-200 pt-5">
          <label className="flex flex-col gap-1 text-sm font-semibold">Reason to decline
            <input className={fieldClass} name="reason" maxLength={1000} required placeholder="Outside area or waste type not accepted" />
          </label>
          <button className="min-h-11 self-start rounded-full border border-danger/30 px-5 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60" disabled={busy} type="submit">Decline request</button>
        </form>
      )}
      {canCollect && (
        <form onSubmit={submit("collect")} className="flex flex-col gap-3 border-t border-leaf-200 pt-5">
          <p className="text-sm font-semibold text-leaf-950">Was the waste segregated?</p>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="segregationOk" value="yes" required /> Yes</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="segregationOk" value="no" required /> No</label>
          <PhotoPicker id="pickup-collect-photo" label="Collection photo (optional)" onChange={setCollectPhoto} />
          <button className={buttonClass} disabled={busy} type="submit">{busy ? "Saving…" : "Mark collected"}</button>
        </form>
      )}
      {canCollect && pickup.policy === "refuse_allowed" && (
        <form onSubmit={submit("refuse")} className="flex flex-col gap-3 border-t border-leaf-200 pt-5">
          <h3 className="font-semibold text-leaf-950">Refuse unsegregated waste</h3>
          <label className="flex flex-col gap-1 text-sm font-semibold">Reason
            <input className={fieldClass} name="reason" maxLength={1000} required />
          </label>
          <PhotoPicker id="pickup-refuse-photo" label="Evidence photo (required)" onChange={setRefusePhoto} />
          <button className="min-h-11 self-start rounded-full border border-danger/30 px-5 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60" disabled={busy} type="submit">Refuse pickup</button>
        </form>
      )}
      {(isRequester || isAdmin) && ["requested", "scheduled"].includes(pickup.status) && (
        <button type="button" onClick={() => void run("cancel")} disabled={busy} className="min-h-11 self-start rounded-full px-5 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60">Cancel pickup</button>
      )}
    </section>
  );
}
