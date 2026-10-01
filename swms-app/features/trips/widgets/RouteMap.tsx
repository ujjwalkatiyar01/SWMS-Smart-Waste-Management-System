"use client";

// One trip's route as a line from start (green) to the last point (red); client-only Leaflet.

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 });
  }, [map, points]);
  return null;
}

export default function RouteMap({ points }: { points: [number, number][] }) {
  return (
    <MapContainer center={points[0] ?? [26.47, 80.33]} zoom={15} scrollWheelZoom={false} className="h-80 w-full rounded-2xl ring-1 ring-leaf-900/10 sm:h-[420px]" aria-label="Route of the selected trip">
      <Fit points={points} />
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
      <Polyline positions={points} pathOptions={{ color: "#1d4ed8", weight: 5, opacity: 0.85 }} />
      {points.length > 0 && (
        <CircleMarker center={points[0]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#2e6420", fillOpacity: 1 }}>
          <Tooltip>Start</Tooltip>
        </CircleMarker>
      )}
      {points.length > 1 && (
        <CircleMarker center={points[points.length - 1]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#b91c1c", fillOpacity: 1 }}>
          <Tooltip>Last point</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
