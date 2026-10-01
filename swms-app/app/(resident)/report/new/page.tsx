import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportForm } from "@/features/reports";
import { getReportFormData } from "@/features/reports/server";

export const metadata: Metadata = { title: "Report an issue — SWMS" };

export default async function ReportNewPage() {
  const data = await getReportFormData();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/my" className="inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-ui font-semibold text-leaf-900 hover:bg-leaf-100">
        <ArrowLeft className="size-4" aria-hidden /> My reports
      </Link>
      <div>
        <p className="eyebrow text-leaf-800">New report</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">
          Report an <span className="accent-serif text-leaf-700">issue</span>
        </h1>
        <p className="mt-1 text-ui text-leaf-950/80">A photo and the place are enough. We&apos;ll keep you posted.</p>
      </div>
      <ReportForm locations={data.locations} farFromSiteM={data.farFromSiteM} />
    </div>
  );
}
