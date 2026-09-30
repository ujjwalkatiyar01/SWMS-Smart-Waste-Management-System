// Home page "/" (public). Sections live in features/home.

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
