import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PICKUP_WASTE_LABEL } from "@/features/staff";
import type { PickupListItem } from "../schema";

export function PickupList({ pickups }: { pickups: PickupListItem[] }) {
  return (
    <section aria-labelledby="my-pickups-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="my-pickups-title" className="text-xl font-bold text-leaf-950">Pickup requests</h2>
        <Link href="/pickup/new" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">Request a pickup</Link>
      </div>
      {pickups.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-leaf-300 bg-white px-6 py-10 text-center">
          <Inbox className="size-8 text-leaf-600" aria-hidden />
          <p className="font-semibold text-leaf-950">No pickup requests yet</p>
          <p className="text-sm text-muted-foreground">Choose a waste type, date and slot to request one.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {pickups.map((p) => <li key={p.id}>
            <Link href={`/pickup/${p.id}`} className="flex min-h-20 items-center gap-3 rounded-2xl border border-leaf-900/10 bg-white p-4 hover:bg-leaf-50">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-leaf-950">{PICKUP_WASTE_LABEL[p.wasteType] ?? p.wasteType} pickup</span>
                <p className="mt-1 text-sm text-muted-foreground">{p.preferredDate} · {p.slot} · {p.address}</p>
              </div>
              <StatusBadge status={p.status} />
              <ChevronRight className="size-5 shrink-0 text-leaf-700" aria-hidden />
            </Link>
          </li>) }
        </ul>
      )}
    </section>
  );
}
