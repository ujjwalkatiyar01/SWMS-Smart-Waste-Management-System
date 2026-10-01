"use client";

// "Mark done" on the case page for the assigned worker (03 F4.4): required after-photo, optional note,
// phone GPS. Far from the site is a warning for admins, never a block.

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toUploadJpeg } from "@/lib/photos/resize";
import { uploadReportPhoto } from "@/lib/photos/upload";
import { completeTask, getTaskState } from "../actions";
import type { TaskState } from "../schema";

type Position = { lat: number; lng: number } | null;

// GPS is optional: denied, unavailable or slow (10 s) all continue without it.
function currentPosition(): Promise<Position> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export function CompletePanel({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [state, setState] = useState<TaskState | "loading" | "error">("loading");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoId = useId();
  const noteId = useId();

  useEffect(() => {
    getTaskState(reportId).then(setState, () => setState("error"));
  }, [reportId]);

  if (state === "loading") return <p className="text-sm text-muted-foreground">Loading task…</p>;
  if (state === "error") return <p className="text-sm text-danger">Could not load this task. Refresh the page.</p>;
  if (state.kind === "none") return null;

  if (state.kind === "done") {
    return (
      <section className="flex flex-col gap-2 rounded-2xl border border-success/30 bg-success-soft p-5 text-success">
        <p className="flex items-center gap-2 font-semibold">
          <CheckCircle2 aria-hidden className="size-5" /> Marked done. Waiting for the resident to confirm.
        </p>
        {state.farFromSite && (
          <p className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            Your location was far from the report location, so admins will see a far-from-site warning.
          </p>
        )}
      </section>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setError("Add an after-photo to mark the task done.");
    setError(null);
    try {
      setStep("Getting your location…");
      const position = await currentPosition();
      setStep("Uploading photo…");
      const upload = await uploadReportPhoto(await toUploadJpeg(file), "after", reportId);
      if (!upload.ok) return setError(upload.message);
      setStep("Saving…");
      const result = await completeTask({
        reportId,
        photoPath: upload.path,
        note,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
      });
      if (!result.ok) return setError(result.message);
      setState(await getTaskState(reportId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
    } finally {
      setStep(null);
    }
  }

  return (
    <section aria-labelledby={`${photoId}-title`} className="rounded-2xl border bg-card p-5">
      <h2 id={`${photoId}-title`} className="text-lg font-bold text-leaf-950">
        Mark done
      </h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={photoId} className="text-sm font-medium text-leaf-950">
            After-photo (required)
          </label>
          <label
            htmlFor={photoId}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-ui text-leaf-950 hover:bg-leaf-50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
          >
            <Camera aria-hidden className="size-5 text-leaf-600" />
            <span className="truncate">{file ? file.name : "Take or choose a photo"}</span>
          </label>
          <input
            id={photoId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-muted-foreground">Avoid faces and vehicle numbers.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-medium text-leaf-950">
            Note (optional)
          </label>
          <textarea
            id={noteId}
            value={note}
            maxLength={1000}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-input bg-card px-3 py-2 text-ui outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <p className="text-sm text-muted-foreground">Your phone location is recorded with the photo if you allow it.</p>

        <Button type="submit" disabled={step !== null} className="h-11 px-5 sm:w-fit">
          {step ?? "Mark done"}
        </Button>
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      </form>
    </section>
  );
}
