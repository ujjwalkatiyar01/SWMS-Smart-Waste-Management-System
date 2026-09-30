// ─────────────────────────────────────────────────────────────
// Route · "/" — Home page (public, no login)
// Only assembles the page; each section lives in features/home/.
// Spec: 01-FRONTEND §3 route "/"
// ─────────────────────────────────────────────────────────────

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Features, Hero, HowItWorks, IssueTypes } from "@/features/home";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <HowItWorks />
        <IssueTypes />
        <Features />
      </main>
      <SiteFooter />
    </>
  );
}
