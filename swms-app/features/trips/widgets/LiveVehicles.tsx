"use client";

// "Where is the vehicle?" card for residents, workers and admins (0900). Refreshes every 15 seconds
// while the page is visible.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { formatDateTime } from "@/lib/time";
import { getLiveVehicles } from "../actions";
import type { LiveVehicle } from "../schema";

const REFRESH_MS = 15_000;

const VehicleMap = dynamic(() => import("./VehicleMap"), {
  ssr: false,
  loading: () => <div role="status" aria-label="Loading map" className="h-72 w-full animate-pulse rounded-2xl bg-leaf-50 sm:h-96" />,
});

export function LiveVehicles({ initial, hint }: { initial: LiveVehicle[]; hint: string }) {
  const [vehicles, setVehicles] = useState(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      getLiveVehicles().then((v) => { setVehicles(v); setStale(false); }).catch(() => setStale(true));
    };
    // One early refresh picks up a trip whose first position arrived just after the page was rendered.
    const first = window.setTimeout(tick, 4000);
    const timer = window.setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return (
    <section aria-labelledby="vehicles-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="vehicles-title" className="text-xl font-bold text-leaf-950">Collection vehicles live</h2>
        <span className="text-sm text-leaf-950/70">Phone GPS · updates every 15 s</span>
      </div>
      <p className="mt-1 text-sm text-leaf-950/80">{hint}</p>
      {vehicles.length ? (
        <div className="mt-4 flex flex-col gap-3">
          <VehicleMap vehicles={vehicles} />
          <ul className="flex flex-col gap-2" aria-live="polite">
            {vehicles.map((v) => (
              <li key={v.tripId} className="flex min-h-11 items-center gap-3 rounded-xl border border-leaf-100 px-4 py-2 text-sm text-leaf-950">
                <Truck className="size-5 shrink-0 text-leaf-700" aria-hidden />
                <span className="flex-1">
                  <strong>{v.vehicleNumber}</strong>
                  {v.driverFirstName && ` · ${v.driverFirstName}`}
                  {v.isMine && " · your trip"}
                  {v.fromArea && v.toArea && <span className="block text-leaf-950/70">{v.fromArea} → {v.toArea}</span>}
                </span>
                <span className="text-leaf-950/70">{formatDateTime(v.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-leaf-50 px-4 py-6 text-center text-ui text-leaf-950/80">No collection vehicle is on a trip right now.</p>
      )}
      {stale && <p role="status" className="mt-2 text-sm text-warning">Couldn&apos;t refresh. Showing the last known positions.</p>}
    </section>
  );
}
