// ─────────────────────────────────────────────────────────────
// Content · Home › Features
// The six required features, each linking to its screen.
// Used by: features/home/sections/Features.tsx
// ─────────────────────────────────────────────────────────────

import { BookOpen, Camera, LayoutDashboard, ListChecks, Truck, UserPlus } from "lucide-react";

// The six required features (problem statement / 02-PRD F1–F6).
export const FEATURES = [
  { icon: UserPlus, title: "Sign up and log in", body: "Residents join their ward or society. Staff get their own role screens.", href: "/signup" },
  { icon: Camera, title: "Report waste issues", body: "Photo, location and issue type in a few taps. A warning appears if the photo may show hazardous waste.", href: "/report/new" },
  { icon: Truck, title: "Request a pickup", body: "Choose the waste type, date and time slot. Follow it from requested to collected.", href: "/pickup/new" },
  { icon: ListChecks, title: "Track complaints", body: "Status, owner, due time and a full timeline, with before and after photos.", href: "/my" },
  { icon: LayoutDashboard, title: "Admin dashboard", body: "Open, overdue and disputed work at a glance, plus places where problems keep returning.", href: "/admin" },
  { icon: BookOpen, title: "Waste awareness", body: "Wet, dry, hazardous and e-waste explained, in English and हिन्दी. No login needed.", href: "/awareness" },
];
