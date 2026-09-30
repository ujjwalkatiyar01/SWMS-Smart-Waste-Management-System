// ─────────────────────────────────────────────────────────────
// Content · Home › What you can report
// The five issue types shown as flip cards (icon ↔ example photo).
// Used by: features/home/sections/IssueTypes.tsx
// ─────────────────────────────────────────────────────────────

import { CalendarX, Recycle, Route, Trash2, TriangleAlert } from "lucide-react";

// Photos: Unsplash License, credits in public/images/issues/CREDITS.md (illustrations, not app data).
// Issue types from 02-PRD F2 / 03-FULL-APP-FLOW F3.1 ("other" is also available in the form).
export const ISSUES = [
  { icon: Trash2, title: "Overflowing bin", img: "/images/issues/overflowing-bin.jpg", hint: "Bin full or spilling over", tone: "from-leaf-400 to-leaf-600" },
  { icon: Route, title: "Garbage on road", img: "/images/issues/garbage-on-road.jpg", hint: "Waste on streets or lanes", tone: "from-leaf-500 to-leaf-700" },
  { icon: CalendarX, title: "Missed collection", img: "/images/issues/missed-collection.jpg", hint: "Pickup didn't happen", tone: "from-leaf-300 to-leaf-500" },
  { icon: TriangleAlert, title: "Illegal dumping", img: "/images/issues/illegal-dumping.jpg", hint: "Waste dumped in open places", tone: "from-leaf-500 to-leaf-800" },
  { icon: Recycle, title: "Improper segregation", img: "/images/issues/improper-segregation.jpg", hint: "Mixed wet and dry waste", tone: "from-leaf-400 to-leaf-700" },
];
