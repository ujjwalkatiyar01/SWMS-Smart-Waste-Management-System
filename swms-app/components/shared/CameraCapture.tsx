"use client";

// Live camera on devices with a webcam or rear camera: shows the stream, takes one still and hands it back as a File.

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

export function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: (reason?: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => onClose("Camera is not available. Allow camera access, or attach a photo instead."));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose]);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" })), "image/jpeg", 0.9);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Take a photo" className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-black/85 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} autoPlay playsInline muted onPlaying={() => setReady(true)} className="aspect-[4/3] w-full object-cover" />
        {!ready && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 text-ui font-semibold text-white">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Starting camera…
          </span>
        )}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={snap} disabled={!ready} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-ui font-semibold text-primary-foreground disabled:opacity-60">
          <Camera className="size-5" aria-hidden /> Capture
        </button>
        <button type="button" onClick={() => onClose()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-ui font-semibold text-leaf-950">
          <X className="size-5" aria-hidden /> Cancel
        </button>
      </div>
    </div>
  );
}
