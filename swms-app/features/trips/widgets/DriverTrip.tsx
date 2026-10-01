"use client";

// Driver's trip panel (0900): scan the vehicle QR (or type its code) to start, then the phone shares its
// GPS position while this page stays open, and "End trip" stops it.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleAlert, Loader2, MapPin, Square, Truck } from "lucide-react";
import { QrScanner } from "@/components/shared/QrScanner";
import { formatDateTime } from "@/lib/time";
import { endTrip, sendTripPosition, startTrip } from "../actions";
import type { MyTrip, TripArea } from "../schema";

const SEND_EVERY_MS = 15_000;

const noSubscribe = () => () => {};
/** Whether this browser can share location (assumed yes while rendering on the server). */
function useGeolocationSupported() {
  return useSyncExternalStore(noSubscribe, () => "geolocation" in navigator, () => true);
}

type Fix = { lat: number; lng: number; accuracyM: number | null };

function toFix(p: GeolocationPosition): Fix {
  return { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) };
}

/** One position for the start or end of a trip; null when GPS is off or slow, the trip still starts. */
function currentFix(): Promise<Fix | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition((p) => resolve(toFix(p)), () => resolve(null), { enableHighAccuracy: true, timeout: 8000 });
  });
}

const selectClass = "h-11 rounded-xl border border-leaf-300 bg-white px-3 text-base text-leaf-950";

export function DriverTrip({ trip, areas, homeAreaId }: { trip: MyTrip | null; areas: TripArea[]; homeAreaId: string | null }) {
  return (
    <section aria-labelledby="trip-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-6">
      <p className="eyebrow text-leaf-600">Driver</p>
      <h2 id="trip-title" className="mt-1 text-xl font-bold text-leaf-950">
        {trip ? `On trip · ${trip.vehicleNumber}` : "Start a trip"}
      </h2>
      {trip?.fromArea && trip.toArea && <p className="mt-1 text-ui font-semibold text-leaf-800">{trip.fromArea} → {trip.toArea}</p>}
      {trip ? <RunningTrip trip={trip} /> : <StartTrip areas={areas} homeAreaId={homeAreaId} />}
    </section>
  );
}

function StartTrip({ areas, homeAreaId }: { areas: TripArea[]; homeAreaId: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fromAreaId, setFromAreaId] = useState(homeAreaId ?? "");
  const [toAreaId, setToAreaId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function start(value: string, scanMethod: "camera" | "typed") {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await startTrip({ code: value, scanMethod, fromAreaId, toAreaId, position: await currentFix() });
      if (result.ok) router.refresh();
      else setError(result.message);
    } catch {
      setError("Could not start the trip. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      <p className="text-sm text-leaf-950/80">
        Scan the QR code stuck in your vehicle. While the trip runs, your phone shares its location so residents and your team can see where the vehicle is.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-leaf-950">
          From (where you start)
          <select value={fromAreaId} onChange={(e) => setFromAreaId(e.target.value)} required className={selectClass}>
            <option value="" disabled>Choose…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-leaf-950">
          To (where you are going)
          <select value={toAreaId} onChange={(e) => setToAreaId(e.target.value)} required className={selectClass}>
            <option value="" disabled>Choose…</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </div>
      <QrScanner title="Scan the vehicle QR code" doneMessage="Vehicle code read. Starting the trip…" onCode={(value) => void start(value, "camera")} />
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void start(code, "typed");
        }}
      >
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-leaf-950">
          Or type the vehicle code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={80}
            autoComplete="off"
            className="h-11 rounded-xl border border-leaf-300 bg-white px-3 font-mono text-base text-leaf-950"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-ui font-semibold text-primary-foreground hover:bg-leaf-800 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Truck className="size-4" aria-hidden />} Start trip
        </button>
      </form>
      <div role="alert">{error && <p className="flex items-start gap-1.5 text-sm font-medium text-danger"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}</p>}</div>
    </div>
  );
}

function RunningTrip({ trip }: { trip: MyTrip }) {
  const router = useRouter();
  const [lastSent, setLastSent] = useState<string | null>(trip.lastSeenAt);
  const [problem, setProblem] = useState<string>();
  const [ending, setEnding] = useState(false);
  const latest = useRef<Fix | null>(null);
  const sentAt = useRef(0);
  const geoSupported = useGeolocationSupported();

  useEffect(() => {
    if (!geoSupported) return;
    let stopped = false;
    let wakeLock: WakeLockSentinel | undefined;
    // Keeps the screen on so the browser keeps sending positions (it stops when the phone locks).
    navigator.wakeLock?.request("screen").then((lock) => { wakeLock = lock; }).catch(() => {});

    async function send(fix: Fix) {
      sentAt.current = Date.now();
      const result = await sendTripPosition({ tripId: trip.id, ...fix }).catch(() => null);
      if (stopped) return;
      if (result?.ok) {
        setLastSent(new Date().toISOString());
        setProblem(undefined);
      } else if (result && result.message === "This trip has ended.") {
        router.refresh();
      } else {
        setProblem("Couldn't send the last position. It will try again.");
      }
    }
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        latest.current = toFix(p);
        if (Date.now() - sentAt.current >= SEND_EVERY_MS) void send(latest.current);
      },
      (e) => setProblem(e.code === e.PERMISSION_DENIED ? "Location is blocked. Allow location for this site so the vehicle shows on the map." : "Waiting for GPS…"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    // The phone reports only when it moves; this also sends the latest fix when it stands still or
    // when a move came too soon after the previous send.
    const timer = window.setInterval(() => {
      if (latest.current && Date.now() - sentAt.current >= SEND_EVERY_MS) void send(latest.current);
    }, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      navigator.geolocation.clearWatch(watch);
      void wakeLock?.release().catch(() => {});
    };
  }, [trip.id, router, geoSupported]);

  async function end() {
    if (ending) return;
    setEnding(true);
    try {
      const result = await endTrip({ tripId: trip.id, position: latest.current });
      if (result.ok) router.refresh();
      else setProblem(result.message);
    } catch {
      setProblem("Could not end the trip. Check your connection and try again.");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p role="status" className="flex items-center gap-2 text-ui font-semibold text-success">
        <span className="relative flex size-3" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-3 rounded-full bg-success" />
        </span>
        Sharing your location
      </p>
      <p className="flex items-center gap-1.5 text-sm text-leaf-950/80">
        <MapPin className="size-4 text-leaf-700" aria-hidden />
        Started {formatDateTime(trip.startedAt)}{lastSent ? ` · last position sent ${formatDateTime(lastSent)}` : " · waiting for the first position"}
      </p>
      <p className="text-sm text-leaf-950/70">Keep this page open while you drive. Positions come from your phone&apos;s GPS, not a vehicle tracker.</p>
      {!geoSupported && <p className="text-sm font-medium text-danger">This phone can&apos;t share its location. The vehicle won&apos;t appear on the map.</p>}
      <div role="alert">{problem && <p className="flex items-start gap-1.5 text-sm font-medium text-warning"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{problem}</p>}</div>
      <button
        type="button"
        onClick={() => void end()}
        disabled={ending}
        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-danger/30 bg-white px-5 text-ui font-semibold text-danger hover:bg-danger-soft disabled:opacity-60"
      >
        {ending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Square className="size-4" aria-hidden />} End trip
      </button>
    </div>
  );
}
