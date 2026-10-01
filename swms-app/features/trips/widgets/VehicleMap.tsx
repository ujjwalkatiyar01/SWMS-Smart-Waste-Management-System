"use client";

// Leaflet map of running vehicles (OpenStreetMap tiles, attribution always visible; client-only).

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { formatDateTime } from "@/lib/time";
import type { LiveVehicle } from "../schema";

function FitToVehicles({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    // Refit only when the set of positions changes, not on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function VehicleMap({ vehicles }: { vehicles: LiveVehicle[] }) {
  const points = useMemo<[number, number][]>(() => vehicles.map((v) => [v.lat, v.lng]), [vehicles]);
  return (
    <MapContainer center={[26.47, 80.33]} zoom={14} scrollWheelZoom={false} className="h-72 w-full rounded-2xl ring-1 ring-leaf-900/10 sm:h-96" aria-label="Map of collection vehicles on a trip">
      <FitToVehicles points={points} />
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {vehicles.map((v) => (
        <CircleMarker key={v.tripId} center={[v.lat, v.lng]} radius={11} pathOptions={{ color: "#ffffff", weight: 3, fillColor: v.isMine ? "#1d4ed8" : "#2e6420", fillOpacity: 0.95 }}>
          <Popup>
            <div className="flex flex-col gap-0.5 text-sm">
              <strong>{v.vehicleNumber}</strong>
              <span className="capitalize">{v.vehicleKind.replace("-", " ")}{v.driverFirstName ? ` · ${v.driverFirstName}` : ""}</span>
              {v.fromArea && v.toArea && <span>{v.fromArea} → {v.toArea}</span>}
              <span>Last position {formatDateTime(v.lastSeenAt)}</span>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
