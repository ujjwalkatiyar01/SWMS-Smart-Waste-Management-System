"use client";

import { RouteError } from "@/features/staff";

export default function StaffError({ retry }: { retry: () => void }) {
  return <RouteError retry={retry} />;
}
