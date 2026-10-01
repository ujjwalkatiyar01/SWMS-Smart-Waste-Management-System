"use client";

// Report a waste issue (03 F3): type → photo (required) → place → waste category (required, R7) → note.
// The photo is uploaded first, then create_report saves the case; nothing is saved unless both finish (F3.6).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { MascotDialog } from "@/components/shared/MascotDialog";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { uploadReportPhoto } from "@/lib/photos/upload";
import { requestAiSuggestion } from "@/lib/ai/upload";
import type { AiResult } from "@/lib/ai/schema";
import type { IssueType, WasteCategory } from "@/types/domain";
import { createReport } from "../actions";
import { ISSUE_TYPES, WASTE_CATEGORIES } from "../content/labels";
import type { CreateReportField, ReportFormData } from "../schema";
import { ChoiceGroup } from "./ChoiceGroup";
import { LocationPicker, type LocationValue } from "./LocationPicker";

type Errors = Partial<Record<CreateReportField | "location", string>>;

export function ReportForm({ locations, farFromSiteM }: ReportFormData) {
  const router = useRouter();
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [uploaded, setUploaded] = useState<{ reportId: string; path: string } | null>(null);
  const [place, setPlace] = useState<LocationValue>({ gps: null, locationId: null, source: "gps" });
  const [category, setCategory] = useState<WasteCategory | null>(null);
  const [suggestion, setSuggestion] = useState<AiResult | null>(null);
  const [aiRunId, setAiRunId] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const photoVersion = useRef(0);
  const manuallyChosen = useRef(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  function check(): Errors {
    const e: Errors = {};
    if (!issueType) e.issueType = "Choose the type of issue.";
    if (!photo) e.photoPath = "Add a photo of the problem.";
    if (!place.gps && !place.locationId) e.location = "Use your location or choose a place.";
    if (!category) e.wasteCategory = "Choose a waste category.";
    if (note.length > 1000) e.note = "Use 1000 characters or fewer.";
    return e;
  }

  async function analyzePhoto(next: Blob | null) {
    const version = ++photoVersion.current;
    setPhoto(next);
    setUploaded(null);
    setSuggestion(null);
    setAiRunId(null);
    setCategory(null);
    setAiMessage("");
    setAnalyzing(false);
    manuallyChosen.current = false;
    if (!next) return;
    setAnalyzing(true);
    const answer = await requestAiSuggestion(next);
    if (photoVersion.current !== version) return;
    setAnalyzing(false);
    if (!answer.ok) { setAiMessage(answer.message); return; }
    setSuggestion(answer.result);
    setAiRunId(answer.runId);
    if (!manuallyChosen.current && answer.result.confidence !== "low" && answer.result.category !== "mixed_uncertain")
      setCategory(answer.result.category);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const found = check();
    setErrors(found);
    setMessage(undefined);
    if (Object.keys(found).length > 0) return;
    setPending(true);

    try {
      let stored = uploaded;
      if (!stored) {
        const result = await uploadReportPhoto(photo!, "before");
        if (!result.ok) {
          setErrors({ photoPath: result.message });
          return;
        }
        stored = { reportId: result.reportId, path: result.path };
        setUploaded(stored); // a retry after a lost response reuses the same report id
      }

      const { gps, locationId } = place;
      const result = await createReport({
        reportId: stored.reportId,
        photoPath: stored.path,
        issueType: issueType!,
        wasteCategory: category!,
        aiRunId,
        note,
        locationId,
        locationSource: place.source,
        // A registered place keeps its own coordinates; GPS is sent as the raw phone position (R1).
        lat: locationId ? null : (gps?.lat ?? null),
        lng: locationId ? null : (gps?.lng ?? null),
        accuracyM: gps?.accuracyM ?? null,
        deviceLat: gps?.lat ?? null,
        deviceLng: gps?.lng ?? null,
      });
      if (result.ok) {
        setSentId(result.reportId);
        return;
      }
      setUploaded(null); // the server removed the photo; the next try uploads it again
      setErrors(result.fieldErrors ?? {});
      setMessage(result.message);
    } catch {
      setMessage("Could not send. Check your connection and try again — your details are kept.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
        <ChoiceGroup
          name="issueType"
          legend="What is the problem?"
          options={ISSUE_TYPES}
          value={issueType}
          onChange={setIssueType}
          error={errors.issueType}
        />
        <PhotoPicker
          id="photo"
          label="Photo of the problem"
          onChange={(p) => { void analyzePhoto(p); }}
          error={errors.photoPath}
        />
        <div role="status" aria-live="polite" className="rounded-2xl border border-leaf-200 bg-leaf-50 p-4 text-sm text-leaf-950">
          {analyzing ? "Checking the photo for a waste-category suggestion…" :
            suggestion ? `AI suggestion: ${suggestion.category.replaceAll("_", " / ")} (${suggestion.confidence} confidence). ${suggestion.reason}` :
            aiMessage || "A photo can suggest a category. You can always choose or change it yourself."}
          {suggestion?.hazard && <p className="mt-2 font-bold text-danger">Possible hazardous / biomedical waste. Do not touch. Keep a safe distance.</p>}
          <p className="mt-2 text-xs text-leaf-950/70">Use demo photos only. Google may use free-tier photos to improve its products.</p>
        </div>
        <LocationPicker
          locations={locations}
          farFromSiteM={farFromSiteM}
          value={place}
          onChange={setPlace}
          error={errors.location ?? errors.locationId}
        />
        <ChoiceGroup
          name="wasteCategory"
          legend="What kind of waste is it?"
          options={WASTE_CATEGORIES}
          value={category}
          onChange={(value) => { manuallyChosen.current = true; setCategory(value); }}
          error={errors.wasteCategory}
          columns={3}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm font-semibold text-leaf-950">
            Note <span className="font-normal text-leaf-950/70">(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={1000}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? "note-error" : undefined}
            placeholder="Anything that helps the team find or fix it"
            className="rounded-2xl border border-leaf-900/15 bg-white px-4 py-3 text-base text-leaf-950 outline-none placeholder:text-leaf-950/50 focus:ring-2 focus:ring-leaf-600"
          />
          {errors.note && (
            <p id="note-error" className="text-sm font-medium text-danger">
              {errors.note}
            </p>
          )}
        </div>

        <div role="alert" aria-live="assertive">
          {message && <p className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{message}</p>}
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-cta transition-[transform,background-color] hover:bg-leaf-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
        >
          {pending ? "Sending report…" : "Send report"}
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ArrowRight className="size-5" aria-hidden />}
        </button>
      </form>

      <MascotDialog
        open={sentId !== null}
        onOpenChange={(open) => !open && router.push("/my")}
        sign={["REPORT", "SENT!"]}
        title="Report sent — we'll keep you posted"
        description="Your case is now with the team. You can follow every step on its page."
      >
        <Link
          href={`/case/${sentId}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-ui font-semibold text-primary-foreground hover:bg-leaf-800"
        >
          Track this case
        </Link>
        <Link
          href="/my"
          className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-ui font-semibold text-leaf-900 ring-1 ring-leaf-900/15 hover:bg-leaf-50"
        >
          Back to my reports
        </Link>
      </MascotDialog>
    </>
  );
}
