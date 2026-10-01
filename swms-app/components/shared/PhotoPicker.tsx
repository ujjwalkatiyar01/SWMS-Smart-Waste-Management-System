"use client";

// Take a photo with the camera or attach one from the device (01-FRONTEND §4 PhotoPicker): converts it to a small JPEG in the browser,
// shows a preview and the privacy notice. The parent uploads the result when the form is submitted.

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleAlert, ImagePlus, Loader2, ShieldAlert } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { toUploadJpeg } from "@/lib/photos/resize";
import { UNSUPPORTED_PHOTO } from "@/lib/photos/contract";

export function PhotoPicker({
  id,
  label,
  onChange,
  error,
}: {
  id: string;
  label: string;
  onChange: (photo: Blob | null) => void;
  error?: string;
}) {
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [camera, setCamera] = useState(false);
  const captureInput = useRef<HTMLInputElement>(null);
  const closeCamera = useCallback((reason?: string) => {
    setCamera(false);
    if (reason) setProblem(reason);
  }, []);

  // Phones open their own camera app; computers use the live camera view when the browser allows it.
  function takePhoto() {
    const phone = window.matchMedia("(pointer: coarse)").matches;
    if (!phone && typeof navigator.mediaDevices?.getUserMedia === "function") setCamera(true);
    else captureInput.current?.click();
  }

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setProblem(undefined);
    try {
      const jpeg = await toUploadJpeg(file);
      setPreview(URL.createObjectURL(jpeg));
      onChange(jpeg);
    } catch (e) {
      setPreview(undefined);
      setProblem(e instanceof Error ? e.message : UNSUPPORTED_PHOTO);
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  const message = problem ?? error;
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-semibold text-leaf-950">
        {label}
      </span>
      <div className="relative flex min-h-44 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-leaf-300 bg-leaf-50 p-4 text-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview blob, not an optimisable asset
          <img src={preview} alt="Selected photo preview" className="max-h-64 w-auto rounded-xl object-contain" />
        ) : (
          <>
            <Camera className="size-8 text-leaf-700" aria-hidden />
            <span className="text-ui font-semibold text-leaf-900">Photo of the waste</span>
          </>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={takePhoto}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800"
          >
            <Camera className="size-4" aria-hidden /> {preview ? "Retake" : "Take photo"}
          </button>
          <label
            htmlFor={id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-leaf-900/20 bg-white px-5 text-ui font-semibold text-leaf-900 hover:bg-leaf-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf-600"
          >
            <ImagePlus className="size-4" aria-hidden /> Attach photo
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              aria-labelledby={`${id}-label`}
              aria-describedby={`${id}-notice${message ? ` ${id}-error` : ""}`}
              aria-invalid={message ? true : undefined}
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
        </div>
        <input
          ref={captureInput}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/80 text-ui font-semibold text-leaf-900">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Preparing photo…
          </span>
        )}
      </div>
      {camera && (
        <CameraCapture
          onCapture={(file) => {
            setCamera(false);
            void onFile(file);
          }}
          onClose={closeCamera}
        />
      )}
      <p id={`${id}-notice`} className="flex items-start gap-1.5 text-sm text-leaf-950/80">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-leaf-700" aria-hidden />
        Avoid faces and vehicle numbers.
      </p>
      {message && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {message}
        </p>
      )}
    </div>
  );
}
