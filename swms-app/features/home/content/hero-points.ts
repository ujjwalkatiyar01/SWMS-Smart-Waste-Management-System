// ─────────────────────────────────────────────────────────────
// Content · Home › Hero quick links
// The four shortcuts listed beside the park scene.
// Used by: features/home/sections/Hero.tsx
// ─────────────────────────────────────────────────────────────

import { Camera, ListChecks, Recycle, Truck } from "lucide-react";

export const POINTS = [
  { icon: Camera, label: "Report with a photo", href: "/report/new" },
  { icon: ListChecks, label: "Track until it's fixed", href: "#how" },
  { icon: Truck, label: "Request a pickup", href: "/pickup/new" },
  { icon: Recycle, label: "Learn to segregate", href: "/awareness" },
];
