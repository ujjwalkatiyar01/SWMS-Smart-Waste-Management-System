"use client";

// Leaflet needs `window`, so the map is loaded in the browser only (01-FRONTEND; 04 G9).

import dynamic from "next/dynamic";

export const MapViewLoader = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-leaf-50 sm:h-[520px]" aria-label="Loading map" role="status" />,
});
