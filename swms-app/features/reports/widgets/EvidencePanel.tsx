"use client";

// Add a photo or note to an open case without making a new report (R4): reporter and followers.

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { uploadReportPhoto } from "@/lib/photos/upload";
import { addEvidence } from "../actions";

export function EvidencePanel({ reportId }: { reportId: string }) {
  const router = useRouter();
  const noteId = useId();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!photo && !note.trim()) return setError("Add a photo or a note.");
    setPending(true);
    setError(undefined);
    try {
      let photoPath: string | null = null;
      if (photo) {
        const upload = await uploadReportPhoto(photo, "evidence", reportId);
        if (!upload.ok) return setError(upload.message);
        photoPath = upload.path;
      }
      const result = await addEvidence({ reportId, photoPath, note });
      if (!result.ok) return setError(result.message);
      setDone(true);
      setPhoto(null);
      setNote("");
      setPickerKey((k) => k + 1);
      router.refresh();
    } catch {
      setError("Could not send. Check your connection and try again — your details are kept.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="evidence-title" className="rounded-2xl border bg-card p-5">
      <h2 id="evidence-title" className="text-lg font-bold text-leaf-950">
        Add more to this case
      </h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">A new photo or note goes on the timeline. No new report is made.</p>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <PhotoPicker key={pickerKey} id="evidence-photo" label="Photo (optional)" onChange={setPhoto} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-semibold text-leaf-950">
            Note (optional)
          </label>
          <textarea
            id={noteId}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            className="rounded-2xl border border-leaf-900/15 bg-white px-4 py-3 text-base text-leaf-950 outline-none focus:ring-2 focus:ring-leaf-600"
          />
        </div>
        <div role="alert">{error && <p className="text-sm font-medium text-danger">{error}</p>}</div>
        {done && (
          <p role="status" className="flex items-center gap-2 text-ui font-semibold text-success">
            <CheckCircle2 className="size-5" aria-hidden /> Added to the case.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800 disabled:cursor-wait disabled:opacity-70"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Add to case
        </button>
      </form>
    </section>
  );
}
