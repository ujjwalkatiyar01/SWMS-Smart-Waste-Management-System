// Admin trip history (1100): who drove which vehicle, from where to where, how far and when; one trip's
// route on a map. Positions come from the driver's phone GPS, not a vehicle tracker.

import Link from "next/link";
import { ArrowLeft, Route } from "lucide-react";
import { EmptyState } from "@/features/staff";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TripHistoryRow } from "../schema";
import { RouteMapLoader } from "../widgets/RouteMapLoader";

function km(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function TripHistory({ trips, selected, route }: { trips: TripHistoryRow[]; selected: string | null; route: [number, number][] }) {
  const current = trips.find((t) => t.tripId === selected);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 font-semibold text-leaf-800"><ArrowLeft className="size-4" aria-hidden /> Dashboard</Link>
        <p className="eyebrow mt-3 text-leaf-600">Admin</p>
        <h1 className="mt-1 text-3xl font-extrabold text-leaf-950">Vehicle trips</h1>
        <p className="mt-2 text-ui text-leaf-950/80">Last 7 days. Routes come from the driver&apos;s phone GPS while the trip page was open.</p>
      </header>

      {current && (
        <section aria-labelledby="route-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
          <h2 id="route-title" className="text-2xl font-bold text-leaf-950">{current.vehicleNumber} · {current.fromArea ?? "?"} → {current.toArea ?? "?"}</h2>
          <p className="mt-1 text-sm text-leaf-950/80">
            {current.driverName} · {current.startedAt ? formatDateTime(current.startedAt) : ""}{current.endedAt ? ` – ${formatDateTime(current.endedAt)}` : " · still running"} · {km(current.distanceM)}
          </p>
          <div className="mt-4">
            {route.length ? <RouteMapLoader points={route} /> : <EmptyState title="No route points" hint="The phone did not send a position on this trip." />}
          </div>
        </section>
      )}

      <section aria-labelledby="trips-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-8">
        <h2 id="trips-title" className="text-2xl font-bold text-leaf-950">All trips</h2>
        {trips.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {trips.map((t) => (
              <li key={t.tripId}>
                <Link href={`/admin/trips?trip=${t.tripId}`} aria-current={t.tripId === selected ? "true" : undefined}
                  className={cn("flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-leaf-50", t.tripId === selected ? "border-leaf-700 bg-leaf-50" : "border-leaf-100")}>
                  <Route className="size-5 text-leaf-700" aria-hidden />
                  <strong className="text-leaf-950">{t.vehicleNumber}</strong>
                  <span className="text-leaf-950">{t.fromArea ?? "?"} → {t.toArea ?? "?"}</span>
                  <span className="text-leaf-950/70">{t.driverName}</span>
                  <span className="text-leaf-950/70">{t.startedAt ? formatDateTime(t.startedAt) : ""}</span>
                  <span className="text-leaf-950/70">{km(t.distanceM)}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", t.status === "in_progress" ? "bg-success-soft text-success" : "bg-leaf-100 text-leaf-900")}>
                    {t.status === "in_progress" ? "Running" : t.status === "completed" ? "Ended" : "Planned"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4"><EmptyState title="No trips in the last 7 days" hint="A driver starts one on their worker page by scanning the vehicle QR code." /></div>
        )}
      </section>
    </div>
  );
}
