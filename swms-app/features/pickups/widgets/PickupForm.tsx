"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { createPickup, editPickup } from "../actions";
import type { PickupFields } from "../schema";

const TYPES = [
  ["wet", "Wet waste"], ["dry", "Dry waste"], ["hazardous", "Hazardous waste"],
  ["bulky", "Bulky waste"], ["e_waste", "E-waste"],
] as const;
const inputClass = "h-12 w-full rounded-xl border border-leaf-300 bg-white px-3 text-base text-leaf-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-700";
const labelClass = "flex flex-col gap-2 text-sm font-semibold text-leaf-950";

export function PickupForm({ initial }: { initial?: PickupFields & { id: string } }) {
  const router = useRouter();
  const requestId = useRef<string | null>(initial?.id ?? null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [errors, setErrors] = useState<Partial<Record<keyof PickupFields, string>>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const id = requestId.current ?? crypto.randomUUID();
    requestId.current = id;
    const fields = {
      wasteType: String(data.get("wasteType") ?? ""), preferredDate: String(data.get("preferredDate") ?? ""),
      slot: String(data.get("slot") ?? ""), address: String(data.get("address") ?? ""), note: String(data.get("note") ?? ""),
    } as PickupFields;
    setPending(true);
    setMessage(undefined);
    setErrors({});
    try {
      const result = initial ? await editPickup({ id, ...fields }) : await createPickup({ id, ...fields });
      if (result.ok) {
        router.push(`/pickup/${result.id}`);
        router.refresh();
      } else {
        setMessage(result.message);
        setErrors(result.fieldErrors ?? {});
      }
    } catch {
      setMessage("Could not save the pickup. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-[1.75rem] border border-leaf-200 bg-white p-5 shadow-card sm:p-7">
      <label className={labelClass}>Waste type
        <select name="wasteType" defaultValue={initial?.wasteType ?? ""} required className={inputClass} aria-invalid={!!errors.wasteType}>
          <option value="" disabled>Choose a waste type</option>
          {TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
        {errors.wasteType && <span className="text-danger">{errors.wasteType}</span>}
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>Preferred date
          <input name="preferredDate" type="date" required defaultValue={initial?.preferredDate ?? ""} className={inputClass} aria-invalid={!!errors.preferredDate} />
          {errors.preferredDate && <span className="text-danger">{errors.preferredDate}</span>}
        </label>
        <label className={labelClass}>Time slot
          <select name="slot" defaultValue={initial?.slot ?? ""} required className={inputClass} aria-invalid={!!errors.slot}>
            <option value="" disabled>Choose a slot</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
          {errors.slot && <span className="text-danger">{errors.slot}</span>}
        </label>
      </div>
      <label className={labelClass}>Pickup address
        <input name="address" required maxLength={300} defaultValue={initial?.address ?? ""} placeholder="Building, street and nearby landmark" className={inputClass} aria-invalid={!!errors.address} />
        {errors.address && <span className="text-danger">{errors.address}</span>}
      </label>
      <label className={labelClass}>Note (optional)
        <textarea name="note" maxLength={1000} defaultValue={initial?.note ?? ""} rows={3} className="w-full rounded-xl border border-leaf-300 bg-white px-3 py-3 text-base text-leaf-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-700" aria-invalid={!!errors.note} />
        {errors.note && <span className="text-danger">{errors.note}</span>}
      </label>
      {message && <p role="alert" className="text-sm font-medium text-danger">{message}</p>}
      <button type="submit" disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-cta hover:bg-leaf-800 disabled:opacity-60">
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {pending ? "Saving…" : initial ? "Save changes" : "Request pickup"}
      </button>
    </form>
  );
}
