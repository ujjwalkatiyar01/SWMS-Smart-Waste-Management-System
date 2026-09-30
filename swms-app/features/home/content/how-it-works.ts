import { Camera, History, MessageSquareHeart, ShieldCheck, UserCheck } from "lucide-react";

// The closed loop from 01-PROJECT-PROPOSAL and 03-FULL-APP-FLOW F3–F7.
export const STEPS = [
  {
    icon: Camera,
    title: "Report",
    who: "Resident",
    body: "Take a photo, confirm the location and pick the issue type. The app can suggest a waste category, and you decide.",
  },
  {
    icon: UserCheck,
    title: "Assign",
    who: "Admin",
    body: "The admin assigns a worker. You can see who owns your complaint and when it is due.",
  },
  {
    icon: ShieldCheck,
    title: "Clean with proof",
    who: "Worker",
    body: "The worker records the cleanup with an after photo and location, so there is evidence, not only a button click.",
  },
  {
    icon: MessageSquareHeart,
    title: "You confirm",
    who: "Resident",
    body: "Say whether it was resolved, partly resolved or not resolved. Not fixed? The case goes back for action.",
  },
  {
    icon: History,
    title: "Spot repeat places",
    who: "Admin",
    body: "If waste keeps returning to the same place, the admin sees its full history and records a prevention review.",
  },
];
