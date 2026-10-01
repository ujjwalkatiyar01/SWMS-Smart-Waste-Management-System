"use client";

import { useRef, useState } from "react";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { requestAiSuggestion } from "@/lib/ai/upload";
import type { AiResult } from "@/lib/ai/schema";

export function WhichBin() {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const photoVersion = useRef(0);
  async function check() {
    if (!photo || busy) return;
    const version = photoVersion.current;
    setBusy(true);
    setMessage("");
    const answer = await requestAiSuggestion(photo);
    if (version !== photoVersion.current) return;
    if (answer.ok) setResult(answer.result);
    else setMessage(answer.message);
    setBusy(false);
  }
  return <section lang="en" aria-labelledby="which-bin-title" className="bg-leaf-100 py-12 sm:py-16">
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <h2 id="which-bin-title" className="section-title text-leaf-950">Which bin?</h2>
      <p className="mt-2 text-ui text-leaf-950/80">Try a photo for an AI waste-category suggestion. You decide where it belongs; check the guide above when unsure.</p>
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <PhotoPicker id="which-bin-photo" label="Waste photo" onChange={(value) => { photoVersion.current++; setPhoto(value); setResult(null); setMessage(""); setBusy(false); }} />
        <p className="mt-3 text-xs text-leaf-950/70">Demo photos only. Google may use free-tier photos to improve its products.</p>
        <button type="button" disabled={!photo || busy} onClick={() => void check()}
          className="mt-5 min-h-12 rounded-full bg-primary px-6 font-semibold text-white hover:bg-leaf-800 disabled:opacity-60">
          {busy ? "Checking…" : "Get suggestion"}
        </button>
        {message && <p role="status" className="mt-4 text-sm text-leaf-800">{message}</p>}
        {result && <div role="status" className="mt-4 rounded-2xl bg-leaf-50 p-4 text-leaf-950">
          <p className="font-semibold">Suggested category: {result.category.replaceAll("_", " / ")}</p>
          <p className="mt-1 text-sm">{result.reason} · {result.confidence} confidence</p>
          {result.hazard && <p className="mt-2 text-sm font-bold text-danger">Possible hazardous / biomedical waste. Do not touch. Keep a safe distance.</p>}
        </div>}
      </div>
    </div>
  </section>;
}
