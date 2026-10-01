import type { BotLink } from "../schema";

// User-facing help distilled from PRD F1–F7 and the full app flow; no internal instructions or private data.
export const HELP: { words: string[]; answer: string; link: BotLink }[] = [
  { words: ["report", "garbage", "overflow", "dumping", "complaint", "issue"], answer: "To report a waste issue, take a photo, choose the issue and location, then submit. You can follow the status and the worker's completion evidence in My reports.", link: { label: "Report an issue", href: "/report/new" } },
  { words: ["pickup", "collection", "request"], answer: "Request a pickup with the waste type, preferred date and slot. You can track whether it is requested, scheduled, collected, declined or missed.", link: { label: "Request a pickup", href: "/pickup/new" } },
  { words: ["status", "track", "progress", "case"], answer: "Open My reports to see each case's current status, due time and timeline. Your own pickup requests are there too.", link: { label: "My activity", href: "/my" } },
  { words: ["worker", "task", "assigned", "finish", "complete", "return"], answer: "Your Worker page lists assigned cases and pickups. Open a case to add completion evidence or return it with a reason; use the pickup page to record collection where assigned.", link: { label: "Worker tasks", href: "/worker" } },
  { words: ["trip", "vehicle", "route", "driver"], answer: "A driver can see the assigned trip and record stop events from the Worker page. Trip taps are reported from the phone; they are not vehicle GPS hardware.", link: { label: "Worker trip", href: "/worker" } },
  { words: ["segregat", "wet", "dry", "hazard", "recycl", "bin", "e-waste"], answer: "The awareness guide explains wet, dry, sanitary, special-care and e-waste sorting, with sources. If an item may be hazardous, do not touch it; keep a safe distance.", link: { label: "Waste guide", href: "/awareness" } },
  { words: ["login", "sign in", "password", "account"], answer: "Log in to see your own reports or assigned work. If you forgot your password, use the reset link on the login page.", link: { label: "Log in", href: "/login" } },
  { words: ["feedback", "confirm", "reopen", "dispute"], answer: "After a worker adds completion evidence, the reporter can review the case and give feedback. If the issue remains, use the case page's available feedback or reopen action within its allowed window.", link: { label: "My reports", href: "/my" } },
  { words: ["missed", "late", "overdue"], answer: "A pickup can become missed when its scheduled window passes. A linked complaint tracks that failure. Case timelines show overdue work and the next action when available.", link: { label: "My activity", href: "/my" } },
  { words: ["duty", "shift", "check-in", "checkin"], answer: "Workers can view assigned duties and check in from the Worker page. Open the duty to start or finish it with the required evidence.", link: { label: "Worker page", href: "/worker" } },
  { words: ["qr", "scan", "location", "gps"], answer: "When reporting, you can select a registered place, use the map or scan its printed QR code. If scanning fails, type the printed code. The app will ask for location permission when a GPS step needs it.", link: { label: "Report an issue", href: "/report/new" } },
  { words: ["notification", "alert", "update"], answer: "The notification bell shows updates for your activity. Open a notification to inspect the related case or pickup.", link: { label: "My activity", href: "/my" } },
  { words: ["points", "badge", "reward", "leaderboard"], answer: "Verified reports can earn points and badges. The resident page shows your progress and an optional area leaderboard; points are not cash.", link: { label: "My rewards", href: "/my" } },
];

export function matchHelp(question: string) {
  const query = question.toLowerCase();
  return HELP.map((item) => ({ item, score: item.words.filter((word) => query.includes(word)).length }))
    .filter((match) => match.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map(({ item }) => item);
}
