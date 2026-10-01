// A registered place: repeat-incident status, risk score, prevention reviews and every case there
// (02-PRD F5 prevention review; 03 F7.2–7.3).

import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";
import { EmptyState } from "@/features/staff";
import { formatDate } from "@/lib/time";
import type { getLocationHistory } from "../server";
import { CaseList } from "../widgets/CaseList";
import { ReviewDone } from "../widgets/ReviewDone";
import { ReviewForm } from "../widgets/ReviewForm";

type History = NonNullable<Awaited<ReturnType<typeof getLocationHistory>>>;

export function LocationHistory({ data }: { data: History }) {
  const flagged = data.incidents >= data.threshold;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <Link href="/admin" className="inline-flex h-11 items-center gap-2 self-start rounded-full px-3 text-ui font-semibold text-leaf-900 hover:bg-leaf-100">
        <ArrowLeft className="size-4" aria-hidden /> Dashboard
      </Link>
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-leaf-600">Place</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-leaf-950">{data.place.name}</h1>
        <p className="text-muted-foreground">{[data.place.areaName, data.place.kind === "bin" ? "Bin" : "Spot"].filter(Boolean).join(" · ")}</p>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          <li className={flagged ? "inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 font-semibold text-danger" : "rounded-full bg-leaf-50 px-3 py-1 font-semibold text-leaf-900"}>
            {flagged && <Flag aria-hidden className="mr-1 inline size-3.5" />}
            {data.incidents} {data.incidents === 1 ? "incident" : "incidents"} in {data.windowDays} days{flagged && ` · flagged at ${data.threshold}`}
          </li>
          {data.risk && (
            <li className="rounded-full bg-leaf-50 px-3 py-1 font-semibold text-leaf-900">
              Risk {data.risk.score} / 100 <span className="font-normal text-muted-foreground">(prediction from demo data, not validated)</span>
            </li>
          )}
        </ul>
      </header>

      <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
        <h2 id="reviews-title" className="text-xl font-bold text-leaf-950">Prevention reviews</h2>
        {data.reviews.length ? (
          <ul className="flex flex-col gap-3">
            {data.reviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={r.status === "open" ? "rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-bold text-warning" : "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-bold text-success"}>
                    {r.status === "open" ? "Open" : "Done"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Owner {r.owner_name}
                    {r.review_date && ` · review ${formatDate(r.review_date)}`}
                  </span>
                </p>
                <p className="text-ui text-leaf-950"><span className="font-semibold">Cause:</span> {r.suspected_cause}</p>
                <p className="text-ui text-leaf-950"><span className="font-semibold">Action:</span> {r.action}</p>
                {r.outcome_note && <p className="text-ui text-leaf-950"><span className="font-semibold">Outcome:</span> {r.outcome_note}</p>}
                {r.status === "open" && <ReviewDone reviewId={r.id} />}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No prevention review yet" hint={flagged ? "This place is flagged. Record the cause and what will change." : "Add one when a place keeps having problems."} />
        )}
        <h3 className="mt-2 font-semibold text-leaf-950">New review</h3>
        <ReviewForm locationId={data.place.id} />
      </section>

      <section aria-labelledby="history-title" className="flex flex-col gap-4">
        <h2 id="history-title" className="text-xl font-bold text-leaf-950">Cases at this place</h2>
        {data.cases.length ? (
          <CaseList rows={data.cases.map((c) => ({ ...c, placeName: data.place.name, areaName: data.place.areaName }))} showReported />
        ) : (
          <EmptyState title="No cases at this place yet" />
        )}
      </section>
    </div>
  );
}
