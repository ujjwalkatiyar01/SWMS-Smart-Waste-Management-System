import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { DemoQrWalkthrough, isDemoRole } from "@/features/setup";

export const metadata: Metadata = { title: "QR workflow demo — SWMS" };

export default async function DemoQrPage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return <>
    <SiteHeader />
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-10 sm:px-6">
      <p className="eyebrow text-leaf-600">SWMS demo</p>
      <h1 className="text-3xl font-extrabold text-leaf-950">What happens after this QR scan?</h1>
      <p className="text-ui text-leaf-950/75">This is a read-only walkthrough. A demo QR does not sign you in or change any work. Operational scans still require the correct account and organisation.</p>
      {demo && isDemoRole(demo) ? <DemoQrWalkthrough flow={demo} /> : <p role="alert" className="rounded-2xl border border-leaf-300 bg-white p-5 text-leaf-950">This demo QR is not recognised.</p>}
      <Link href="/" className="inline-flex min-h-11 items-center self-start rounded-full border border-leaf-300 bg-white px-5 font-semibold text-leaf-800 hover:bg-leaf-50">Home</Link>
    </main>
    <SiteFooter />
  </>;
}
