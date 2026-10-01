"use client";

// Demo QR images explain the documented flows without invoking operational QR actions.

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CircleAlert, ImageUp } from "lucide-react";
import { demoRoles, isDemoRole, type DemoFlow, type DemoRole } from "../content/qrDemo";
import { DemoQrWalkthrough } from "./DemoQrWalkthrough";

type Match = { flow: DemoFlow; name?: string };
type Place = { name: string; kind: string; qr_code: string };
type Vehicle = { number: string; qr_code: string };
const DECODE_TIMEOUT_MS = 10_000;

function roleFromCode(code: string): DemoRole | null {
  try {
    const url = new URL(code);
    if (url.origin !== window.location.origin || url.pathname !== "/demo/qr") return null;
    const role = url.searchParams.get("demo");
    return role && isDemoRole(role) ? role : null;
  } catch {
    return null;
  }
}

export function DemoQrPanel({
  places,
  vehicles,
  initialDemo,
}: {
  places: Place[];
  vehicles: Vehicle[];
  initialDemo: DemoRole | null;
}) {
  const [match, setMatch] = useState<Match | null>(initialDemo ? { flow: initialDemo } : null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<Partial<Record<DemoRole, string>>>({});
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    Promise.all(demoRoles.map(async ({ id }) => [id, await QRCode.toDataURL(`${window.location.origin}/demo/qr?demo=${id}`, { width: 176, margin: 1 })] as const))
      .then((entries) => { if (active) setImages(Object.fromEntries(entries)); })
      .catch(() => { if (active) setMessage("Could not generate the sample QR images."); });
    return () => { active = false; };
  }, []);

  function showCode(code: string) {
    const role = roleFromCode(code);
    if (role) {
      setMatch({ flow: role });
      setMessage("");
      return;
    }
    const place = places.find((item) => item.qr_code === code);
    if (place) {
      setMatch({ flow: place.kind === "disposal_site" ? "disposal" : "report", name: place.name });
      setMessage("");
      return;
    }
    const vehicle = vehicles.find((item) => item.qr_code === code);
    if (vehicle) {
      setMatch({ flow: "driver", name: vehicle.number });
      setMessage("");
      return;
    }
    setMatch(null);
    setMessage("QR code not recognised for this demo or organisation. No action was taken.");
  }

  async function readImage(file: File | undefined) {
    if (!file) return;
    const current = ++requestId.current;
    setMatch(null);
    setMessage("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Choose a PNG, JPEG or WebP image under 5 MB.");
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    let timer: number | undefined;
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const result = await Promise.race([
        new BrowserQRCodeReader().decodeFromImageUrl(url),
        new Promise<never>((_resolve, reject) => {
          timer = window.setTimeout(() => reject(new Error("QR decode timed out")), DECODE_TIMEOUT_MS);
        }),
      ]);
      if (current === requestId.current) showCode(result.getText().trim());
    } catch {
      if (current === requestId.current) setMessage("No readable QR code was found in this image. Try a clearer image.");
    } finally {
      if (timer !== undefined) window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      if (current === requestId.current) setBusy(false);
    }
  }

  return (
    <section aria-labelledby="demo-qr-title" className="mt-7 rounded-3xl border border-leaf-300 bg-leaf-50/70 p-5 print:hidden sm:p-6">
      <p className="eyebrow text-leaf-600">Read-only demo</p>
      <h2 id="demo-qr-title" className="mt-1 text-2xl font-extrabold text-leaf-950">Try a QR workflow</h2>
      <p className="mt-2 max-w-3xl text-sm text-leaf-950/75">Upload a QR image from this page or use a sample below. The image stays in your browser. This walkthrough explains what a real scan processes; it never changes app data or grants access.</p>
      <label htmlFor="demo-qr-image" className="mt-5 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-leaf-600 bg-white px-4 py-3 text-center font-semibold text-leaf-800 transition-colors hover:bg-leaf-100">
        <ImageUp className="size-5" aria-hidden /> {busy ? "Reading QR image…" : "Upload a QR image"}
      </label>
      <input id="demo-qr-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={busy}
        onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void readImage(file); }} />
      <p className="mt-2 text-xs text-leaf-950/65">PNG, JPEG or WebP · up to 5 MB. Codes from another organisation are not accepted.</p>
      {message && <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-semibold text-danger"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{message}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {demoRoles.map(({ id, label }) => <div key={id} className="rounded-2xl border border-leaf-200 bg-white p-4 text-center">
          {images[id] && <>
            {/* Data URL is generated in this browser for a read-only route on this site. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[id]} alt={`${label} demo QR`} width={176} height={176} className="mx-auto" />
          </>}
          <p className="mt-2 font-bold text-leaf-950">{label}</p>
          <button type="button" onClick={() => { setMatch({ flow: id }); setMessage(""); }} className="mt-2 min-h-11 rounded-full border border-leaf-300 px-4 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">Preview demo</button>
          {images[id] && <a href={images[id]} download={`swms-${id}-demo-qr.png`} className="mt-2 block text-sm font-semibold text-leaf-700 underline">Save QR image</a>}
        </div>)}
      </div>

      {match && <div className="mt-6"><DemoQrWalkthrough flow={match.flow} name={match.name} /></div>}
    </section>
  );
}
