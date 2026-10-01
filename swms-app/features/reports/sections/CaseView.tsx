// Case page /case/[id] (03 F4): status, place, due time and flags, before/after photos, timeline and
// the reporter's feedback. Followers and the higher authority get the summary only (P1).
// `actions` holds the role panels the page mounts (assign, complete).

import type { ReactNode } from "react";
import { CircleAlert, Clock, ImageOff, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Timeline } from "@/components/shared/Timeline";
import { formatDateTime, hoursOverdue } from "@/lib/time";
import { categoryLabel, isFinished, issueLabel } from "../content/labels";
import type { CaseDetail, CaseSummaryView } from "../schema";
import { FeedbackForm } from "../widgets/FeedbackForm";

export function CaseView({ data, actions }: { data: CaseDetail | CaseSummaryView; actions?: ReactNode }) {
  const place = [data.placeName ?? (data.kind === "full" ? "Phone GPS location" : null), data.areaName].filter(Boolean).join(", ");
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="eyebrow text-leaf-800">Case</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-leaf-950">{issueLabel(data.issueType)}</h1>
          <StatusBadge status={data.status} />
        </div>
        <ul className="flex flex-col gap-1.5 text-ui text-leaf-950/85">
          {place && (
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-leaf-700" aria-hidden /> {place}
            </li>
          )}
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-leaf-700" aria-hidden />
            Reported {formatDateTime(data.createdAt)}
            {!isFinished(data.status) && ` · due ${formatDateTime(data.dueAt)}`}
          </li>
        </ul>
        <Flags data={data} />
      </header>

      {data.kind === "full" && <Details data={data} />}
      {actions}

      <section aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-xl font-bold text-leaf-950">
          Timeline
        </h2>
        {data.kind === "summary" && (
          <p className="mt-1 text-sm text-muted-foreground">Summary view: photos, notes, feedback and names are shown only to the people handling this case.</p>
        )}
        <div className="mt-4">
          <Timeline events={data.events} />
        </div>
      </section>
    </article>
  );
}

function Flags({ data }: { data: CaseDetail | CaseSummaryView }) {
  const flags: string[] = [];
  if (data.overdue) flags.push(`Overdue by ${hoursOverdue(data.dueAt)}h`);
  if (data.kind === "summary" && data.escalationLevel > 0) flags.push(data.escalationLevel === 2 ? "Escalated to higher authority" : "Escalated");
  if (data.kind === "full" && data.viewer.role !== "resident") {
    if (data.farFromSite) flags.push("Completed far from site");
    if (data.locationMismatch) flags.push("Location mismatch");
  }
  if (flags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {flags.map((f) => (
        <li key={f} className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
          <CircleAlert className="size-3.5" aria-hidden /> {f}
        </li>
      ))}
    </ul>
  );
}

function Details({ data }: { data: CaseDetail }) {
  const askFeedback = data.viewer.isReporter && data.status === "awaiting_review";
  return (
    <>
      <section aria-labelledby="photos-title" className="flex flex-col gap-4">
        <h2 id="photos-title" className="text-xl font-bold text-leaf-950">
          Before and after
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Photo url={data.beforePhotoUrl} label="Before" caption={data.note} />
          <Photo url={data.afterPhotoUrl} label="After" caption={data.completionNote} emptyText="The after-photo appears when the work is done." />
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-ui sm:grid-cols-3">
          <Fact label="Waste category" value={categoryLabel(data.wasteCategory)} />
          <Fact label="Reported by" value={data.reporterFirstName ?? "—"} />
          <Fact label="Assigned worker" value={data.workerFirstName ?? "Not assigned yet"} />
        </dl>
      </section>

      {askFeedback && (
        <section aria-labelledby="feedback-title" className="rounded-[1.75rem] border border-leaf-300 bg-leaf-50 p-5 sm:p-6">
          <h2 id="feedback-title" className="text-xl font-bold text-leaf-950">
            Check the work
          </h2>
          <p className="mb-5 mt-1 text-ui text-leaf-950/80">Compare the before and after photos, then tell us if the problem is fixed.</p>
          <FeedbackForm reportId={data.id} />
        </section>
      )}
    </>
  );
}

function Photo({ url, label, caption, emptyText }: { url: string | null; label: string; caption: string | null; emptyText?: string }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-leaf-50 ring-1 ring-leaf-900/10">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link from private storage
          <img src={url} alt={`${label} photo`} className="size-full object-cover" />
        ) : (
          <p className="flex flex-col items-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            {emptyText ?? "Photo not available."}
          </p>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-leaf-900">{label}</span>
      </div>
      {caption && <figcaption className="text-sm text-leaf-950/80">{caption}</figcaption>}
    </figure>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-leaf-950">{value}</dd>
    </div>
  );
}
