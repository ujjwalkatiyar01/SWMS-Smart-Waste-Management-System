// ─────────────────────────────────────────────────────────────
// Feature · Home — public entry point
// Pages import the home sections only from here, so the folders
// inside features/home/ can change without touching the route.
//
//   sections/  the page sections, top to bottom
//   widgets/   interactive pieces used inside sections
//   scene/     the decorative park SVG and its parts
//   content/   text and lists shown on the page (no UI code)
// ─────────────────────────────────────────────────────────────

export { Hero } from "./sections/Hero";
export { HowItWorks } from "./sections/HowItWorks";
export { IssueTypes } from "./sections/IssueTypes";
export { Features } from "./sections/Features";
