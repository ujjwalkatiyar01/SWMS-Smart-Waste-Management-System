// Admin map (02-PRD F5): places coloured by open cases, flagged places, risk, GPS-only reports. A text list
// repeats the same facts, so nothing depends on colour alone.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/features/staff";
import type { getMapData } from "../server";
import { PIN } from "../map-colors";
import { MapViewLoader } from "../widgets/MapViewLoader";

type MapData = Awaited<ReturnType<typeof getMapData>>;

const LEGEND = [
  [PIN.overdue, "Has an overdue case"],
  [PIN.open, "Has an open case"],
  [PIN.clear, "No open cases"],
  [PIN.site, "Disposal site"],
  [PIN.gps, "Report from phone GPS only"],
] as const;

export function AdminMap({ data }: { data: MapData }) {
  const listed = data.places.filter((p) => p.kind !== "disposal_site").sort((a, b) => b.overdue - a.overdue || b.open - a.open || (b.risk ?? 0) - (a.risk ?? 0));
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link href="/admin" className="inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-ui font-semibold text-leaf-900 hover:bg-leaf-100">
        <ArrowLeft className="size-4" aria-hidden /> Dashboard
      </Link>
      <header>
        <p className="eyebrow text-leaf-600">Admin</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-leaf-950">Map</h1>
        <p className="mt-1 text-muted-foreground">Larger circles have a higher predicted risk (prediction from demo data, not validated). A dark ring marks a flagged place.</p>
      </header>

      <MapViewLoader data={data} />

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-leaf-950" aria-label="Map legend">
        {LEGEND.map(([color, label]) => (
          <li key={label} className="flex items-center gap-2">
            <span aria-hidden className="size-3.5 rounded-full ring-2 ring-white" style={{ background: color }} /> {label}
          </li>
        ))}
      </ul>

      <section aria-labelledby="places-title" className="flex flex-col gap-3">
        <h2 id="places-title" className="text-xl font-bold text-leaf-950">Places</h2>
        {listed.length ? (
          <ul className="flex flex-col gap-2">
            {listed.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/location/${p.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-3 hover:bg-leaf-50">
                  <span className="font-medium text-leaf-950">
                    {p.name}
                    {p.areaName && <span className="font-normal text-muted-foreground"> · {p.areaName}</span>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {p.open} open · {p.overdue} overdue{p.flagged && " · flagged"}
                    {p.risk !== null && ` · risk ${p.risk}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No places with a map position yet" hint="Add places with a position under Setup." />
        )}
      </section>
    </div>
  );
}
