"use client";

import dynamic from "next/dynamic";

export const RouteMapLoader = dynamic(() => import("./RouteMap"), {
  ssr: false,
  loading: () => <div role="status" aria-label="Loading map" className="h-80 w-full animate-pulse rounded-2xl bg-leaf-50 sm:h-[420px]" />,
});
