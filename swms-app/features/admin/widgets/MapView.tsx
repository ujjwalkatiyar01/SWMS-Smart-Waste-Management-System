"use client";

// Leaflet map with OpenStreetMap tiles (01-FRONTEND: client-only, attribution always visible).
// Pins: registered places coloured by their worst open case, flagged places with a heavy ring, disposal sites in blue,
// and small pins for open reports made from phone GPS only.

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { PIN } from "../map-colors";
import type { getMapData } from "../server";

type MapData = Awaited<ReturnType<typeof getMapData>>;

function placeColor(p: MapData["places"][number]) {
  if (p.kind === "disposal_site") return PIN.site;
  return p.overdue > 0 ? PIN.overdue : p.open > 0 ? PIN.open : PIN.clear;
}

// Fits the view to every pin once the map has its real size (the container is measured after it loads).
function FitToPins({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
  }, [map, points]);
  return null;
}

export default function MapView({ data }: { data: MapData }) {
  const points = useMemo<[number, number][]>(() => [...data.places, ...data.gpsReports].map((p) => [p.lat, p.lng]), [data]);
  return (
    <MapContainer
      center={[26.47, 80.33]}
      zoom={14}
      scrollWheelZoom={false}
      className="h-[420px] w-full rounded-2xl ring-1 ring-leaf-900/10 sm:h-[520px]"
      aria-label="Map of places and open reports"
    >
      <FitToPins points={points} />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {data.places.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.kind === "disposal_site" ? 11 : 9 + Math.round((p.risk ?? 0) / 14)}
          pathOptions={{ color: p.flagged ? "#7f1d1d" : "#ffffff", weight: p.flagged ? 4 : 2, fillColor: placeColor(p), fillOpacity: 0.9 }}
        >
          <Popup>
            <div className="flex min-w-44 flex-col gap-1 text-sm">
              <strong>{p.name}</strong>
              <span>{p.kind === "disposal_site" ? "Disposal site" : [p.areaName, p.kind === "bin" ? "Bin" : "Spot"].filter(Boolean).join(" · ")}</span>
              {p.kind !== "disposal_site" && (
                <>
                  <span>
                    {p.open} open · {p.overdue} overdue
                  </span>
                  {p.flagged && <span className="font-semibold text-danger">Flagged: repeat incidents</span>}
                  {p.risk !== null && <span>Risk {p.risk} / 100 (prediction)</span>}
                  <Link href={`/admin/location/${p.id}`} className="font-semibold text-leaf-800 underline">
                    Place history
                  </Link>
                </>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {data.gpsReports.map((r) => (
        <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={6} pathOptions={{ color: "#ffffff", weight: 2, fillColor: PIN.gps, fillOpacity: 0.9 }}>
          <Popup>
            <div className="flex flex-col gap-1 text-sm">
              <strong>Report from phone GPS</strong>
              <span>{r.status.replaceAll("_", " ")}</span>
              <Link href={`/case/${r.id}`} className="font-semibold text-leaf-800 underline">
                Open case
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
