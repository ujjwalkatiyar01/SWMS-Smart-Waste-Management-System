"use client";

// Reads one QR code with the camera (bins, places and vehicles; 04 G1). Typed codes are the fallback in the parent.

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

export function QrScanner({
  onCode,
  title = "Scan a bin QR code",
  doneMessage = "QR code read. Check the selected place below.",
}: {
  onCode: (code: string) => void;
  title?: string;
  doneMessage?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => () => controls.current?.stop(), []);
  async function start() {
    if (scanning || !video.current) return;
    setMessage("");
    setScanning(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controls.current = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false }, video.current,
        (result, _error, current) => {
          if (result) {
            current.stop();
            controls.current = null;
            setScanning(false);
            onCode(result.getText());
            setMessage(doneMessage);
          }
        },
      );
    } catch {
      setScanning(false);
      setMessage("Camera unavailable. Type the printed code instead.");
    }
  }
  function stop() { controls.current?.stop(); controls.current = null; setScanning(false); }
  return <div className="rounded-2xl border border-leaf-900/15 bg-white p-4">
    <p className="text-sm font-semibold text-leaf-950">{title}</p>
    <p className="mt-1 text-sm text-leaf-950/70">Camera access starts only when you tap Scan. You can type the printed code below instead.</p>
    <video ref={video} muted playsInline className={`${scanning ? "mt-3 aspect-video w-full rounded-xl bg-leaf-950 object-cover" : "hidden"}`} />
    <button type="button" onClick={() => void (scanning ? stop() : start())}
      className="mt-3 min-h-11 rounded-full border border-leaf-300 px-5 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">
      {scanning ? "Stop camera" : "Scan QR"}
    </button>
    {message && <p role="status" className="mt-2 text-sm text-leaf-800">{message}</p>}
  </div>;
}
