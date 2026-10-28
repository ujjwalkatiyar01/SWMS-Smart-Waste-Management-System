"use client";

import dynamic from "next/dynamic";

export const UttarPradeshMapLoader = dynamic(() => import("./UttarPradeshMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-2xl bg-leaf-50 text-leaf-950 sm:h-[520px]" role="status">
      Loading Uttar Pradesh map…
    </div>
  ),
});
