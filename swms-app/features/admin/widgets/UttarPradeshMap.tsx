"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";

// A viewing extent for the state, not an administrative boundary or service area.
const UP_VIEW: LatLngBoundsExpression = [[23.8, 77.0], [30.5, 84.7]];

function ResetView() {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.fitBounds(UP_VIEW, { padding: [16, 16], animate: false })}
      className="absolute right-3 top-3 z-[1000] min-h-11 rounded-xl border bg-card px-4 text-sm font-semibold text-leaf-950 shadow-card hover:bg-leaf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-700"
    >
      Reset UP view
    </button>
  );
}

export default function UttarPradeshMap() {
  return (
    <div role="region" aria-label="Uttar Pradesh overview map">
      <MapContainer
        bounds={UP_VIEW}
        boundsOptions={{ padding: [16, 16] }}
        scrollWheelZoom={false}
        className="isolate h-80 w-full rounded-2xl ring-1 ring-leaf-900/10 sm:h-[520px] [&_.leaflet-control-zoom_a]:!size-11 [&_.leaflet-control-zoom_a]:!leading-[44px]"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />
        <ResetView />
      </MapContainer>
    </div>
  );
}
