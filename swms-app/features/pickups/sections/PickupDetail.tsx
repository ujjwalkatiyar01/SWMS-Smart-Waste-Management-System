import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PICKUP_WASTE_LABEL } from "@/features/staff";
import { formatDateTime } from "@/lib/time";
import type { PickupDetail as Detail } from "../schema";
import { PickupActions } from "../widgets/PickupActions";
import { PickupForm } from "../widgets/PickupForm";

export function PickupDetail({ pickup }: { pickup: Detail }) {
  const isRequester = pickup.requesterId === pickup.viewerId;
  return (
    <article className="flex flex-col gap-8">
      <header>
        <p className="eyebrow text-leaf-800">Pickup request</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold text-leaf-950">{PICKUP_WASTE_LABEL[pickup.wasteType] ?? pickup.wasteType} pickup</h1>
          <StatusBadge status={pickup.status} />
        </div>
        <p className="mt-2 text-ui text-leaf-950/80">{pickup.preferredDate} · {pickup.slot} · {pickup.address}</p>
        {pickup.note && <p className="mt-2 text-sm text-leaf-950/80">{pickup.note}</p>}
        {pickup.declineReason && <p className="mt-2 text-sm text-danger">Declined: {pickup.declineReason}</p>}
        {pickup.refuseReason && <p className="mt-2 text-sm text-danger">Refused: {pickup.refuseReason}</p>}
        {pickup.photoUrl && <a href={pickup.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center font-semibold text-leaf-800 underline">View pickup photo</a>}
        {pickup.segregationOk === false && <p className="mt-2 text-sm text-warning">The waste was marked as not segregated. <Link href="/awareness" className="font-semibold underline">See the guide</Link>.</p>}
        {pickup.linkedReportId && <Link href={`/case/${pickup.linkedReportId}`} className="mt-3 inline-flex min-h-11 items-center font-semibold text-leaf-800 underline-offset-4 hover:underline">View linked missed-collection complaint</Link>}
      </header>
      {isRequester && pickup.status === "requested" && (
        <section aria-labelledby="edit-pickup-title">
          <h2 id="edit-pickup-title" className="mb-4 text-xl font-bold text-leaf-950">Edit request</h2>
          <PickupForm initial={{ id: pickup.id, wasteType: pickup.wasteType as "wet", preferredDate: pickup.preferredDate,
            slot: pickup.slot as "morning", address: pickup.address ?? "", note: pickup.note ?? "" }} />
        </section>
      )}
      <PickupActions pickup={pickup} />
      <section aria-labelledby="pickup-timeline-title">
        <h2 id="pickup-timeline-title" className="text-xl font-bold text-leaf-950">Timeline</h2>
        {pickup.events.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No changes yet.</p> :
          <ol className="mt-4 border-l-2 border-leaf-200 pl-5">
            {pickup.events.map((event) => <li key={event.id} className="relative pb-5 last:pb-0">
              <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full bg-leaf-600" aria-hidden />
              <p className="font-semibold capitalize text-leaf-950">{event.type.replaceAll("_", " ")}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(event.at)}</p>
              {event.note && <p className="mt-1 text-sm text-leaf-950/80">{event.note}</p>}
              {event.oldDate && <p className="mt-1 text-sm text-leaf-950/80">Previous: {event.oldDate} · {event.oldSlot}</p>}
            </li>)}
          </ol>}
      </section>
    </article>
  );
}
