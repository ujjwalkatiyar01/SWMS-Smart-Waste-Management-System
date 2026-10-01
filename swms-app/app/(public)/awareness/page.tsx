import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AwarenessGuide } from "@/features/awareness";

export const metadata: Metadata = {
  title: "Waste awareness — SWMS",
  description: "How to separate household waste into wet, dry, sanitary and special care streams, and what to do with e-waste.",
};

export default function AwarenessPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <AwarenessGuide />
      </main>
      <SiteFooter />
    </>
  );
}
