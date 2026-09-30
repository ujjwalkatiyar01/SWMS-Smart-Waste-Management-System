// ─────────────────────────────────────────────────────────────
// Content · Home › Sample case tracker
// The statuses the demo case card steps through on each tap.
// Used by: features/home/widgets/CaseTrackerCard.tsx
// ─────────────────────────────────────────────────────────────

import { Camera, CircleCheck, ClipboardCheck, UserCheck } from "lucide-react";

// Sample case (demo data) following the case lifecycle in 03-FULL-APP-FLOW F3–F4.
export const STEPS = [
  { status: "Submitted", note: "Photo and location sent", icon: Camera },
  { status: "Assigned", note: "Worker: Ravi · due today 6 PM", icon: UserCheck },
  { status: "Awaiting review", note: "Worker added an after photo", icon: ClipboardCheck },
  { status: "Closed", note: "You confirmed: Resolved", icon: CircleCheck },
];
