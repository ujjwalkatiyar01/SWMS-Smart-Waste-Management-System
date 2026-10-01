"use client";

// Where is the problem? (03 F3.3, F3.3b, F3.3g): phone GPS with accuracy, or a registered bin/spot
// (nearest first when GPS is on). Shows "far from this place" and "open case here" notices; never blocks.

import { useEffect, useState } from "react";
import { CircleAlert, Info, Loader2, LocateFixed, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { distanceM } from "@/lib/geo";
import { relative } from "@/lib/time";
import { checkOpenCase, followReport, resolveQr } from "../actions";
import { issueLabel } from "../content/labels";
import type { OpenCase, ReportLocation } from "../schema";
import { QrScanner } from "./QrScanner";

export interface Gps {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface LocationValue {
  gps: Gps | null;
  locationId: string | null;
  source: "gps" | "registered" | "qr";
}

type GpsState = "idle" | "finding" | "found" | "denied";

export function LocationPicker({
  locations,
  farFromSiteM,
  value,
  onChange,
  error,
}: {
  locations: ReportLocation[];
  farFromSiteM: number;
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  error?: string;
}) {
  const [gpsState, setGpsState] = useState<GpsState>(value.gps ? "found" : "idle");
  const [openCase, setOpenCase] = useState<OpenCase | null>(null);
  const [code, setCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [followed, setFollowed] = useState<{ reportId: string; state: "saving" | "done" | "failed"; message?: string }>();
  const { gps, locationId } = value;

  // Duplicate warning for the chosen place; ignore answers that arrive after the choice changed.
  useEffect(() => {
    if (!locationId) return;
    let current = true;
    checkOpenCase(locationId)
      .then((c) => current && setOpenCase(c))
      .catch(() => current && setOpenCase(null));
    return () => {
      current = false;
    };
  }, [locationId]);

  // The follow answer belongs to one case; a different place shows a fresh notice.
  const follow = followed?.reportId === openCase?.reportId ? followed : undefined;

  async function followOpenCase(reportId: string) {
    setFollowed({ reportId, state: "saving" });
    try {
      const result = await followReport(reportId);
      setFollowed(result.ok ? { reportId, state: "done" } : { reportId, state: "failed", message: result.message });
    } catch {
      setFollowed({ reportId, state: "failed", message: "Could not follow. Check your connection and try again." });
    }
  }

  function findMe() {
    if (!("geolocation" in navigator)) return setGpsState("denied");
    setGpsState("finding");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsState("found");
        onChange({ ...value, gps: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy) },
          source: value.locationId ? value.source : "gps" });
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const withDistance = locations.map((l) => ({
    ...l,
    distance: gps && l.lat !== null && l.lng !== null ? distanceM(gps.lat, gps.lng, l.lat, l.lng) : null,
  }));
  if (gps) withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  const chosen = withDistance.find((l) => l.id === locationId);
  const farFromChosen = chosen?.distance != null && chosen.distance > farFromSiteM;

  async function applyPrintedCode(scannedCode = code) {
    if (checkingCode) return;
    setCheckingCode(true);
    setCodeMessage("");
    try {
      const found = await resolveQr(scannedCode);
      if (!found || !locations.some((place) => place.id === found.id)) {
        setCodeMessage("Code not recognised for a bin or spot in your organisation.");
      } else {
        onChange({ ...value, locationId: found.id, source: "qr" });
        setCodeMessage(`Selected ${found.name}.`);
      }
    } catch { setCodeMessage("Could not check the code. Try again or choose a place."); }
    finally { setCheckingCode(false); }
  }

  return (
    <fieldset aria-describedby={error ? "location-error" : undefined} className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-leaf-950">Where is it?</legend>

      <div className="flex flex-col gap-2 rounded-2xl border border-leaf-900/15 bg-white p-4">
        {gpsState === "found" && gps ? (
          <p className="flex items-start gap-2 text-ui text-leaf-950">
            <LocateFixed className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <span>
              Your location is saved <span className="text-leaf-950/70">(accurate to about {gps.accuracyM} m)</span>
            </span>
          </p>
        ) : (
          <button
            type="button"
            onClick={findMe}
            disabled={gpsState === "finding"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-leaf-100 px-5 text-ui font-semibold text-leaf-900 transition-colors hover:bg-leaf-200 disabled:cursor-wait"
          >
            {gpsState === "finding" ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <LocateFixed className="size-5" aria-hidden />}
            {gpsState === "finding" ? "Finding your location…" : "Use my location"}
          </button>
        )}
        {gpsState === "denied" && (
          <p className="flex items-start gap-2 text-sm text-leaf-950/80" role="status">
            <Info className="mt-0.5 size-4 shrink-0 text-leaf-700" aria-hidden />
            Location is off or not available. Choose the place from the list below.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="locationId" className="text-sm font-semibold text-leaf-950">
          Registered bin or spot {gps && <span className="font-normal text-leaf-950/70">(nearest first; optional)</span>}
        </label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-leaf-700" aria-hidden />
          <select
            id="locationId"
            value={locationId ?? ""}
            onChange={(e) => {
              setOpenCase(null);
              onChange({ ...value, locationId: e.target.value || null, source: e.target.value ? "registered" : "gps" });
            }}
            className="h-12 w-full appearance-none rounded-2xl border border-leaf-900/15 bg-white pl-11 pr-4 text-base text-leaf-950 outline-none focus:ring-2 focus:ring-leaf-600"
          >
            <option value="">{gps ? "Use my GPS spot" : "Choose a place…"}</option>
            {withDistance.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.areaName ? ` — ${l.areaName}` : ""}
                {l.distance !== null ? ` (${Math.round(l.distance)} m)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <QrScanner onCode={(value) => { setCode(value); void applyPrintedCode(value); }} />

      <div className="rounded-2xl border border-leaf-900/15 bg-white p-4">
        <label htmlFor="printed-code" className="text-sm font-semibold text-leaf-950">Printed bin code</label>
        <p className="mt-1 text-sm text-leaf-950/70">If the QR cannot be scanned, type the code printed below it.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input id="printed-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={80}
            className="h-11 min-w-44 flex-1 rounded-xl border border-leaf-300 bg-white px-3 text-base text-leaf-950" />
          <button type="button" onClick={() => void applyPrintedCode()} disabled={checkingCode || code.trim().length < 16}
            className="min-h-11 rounded-full bg-leaf-700 px-5 text-sm font-semibold text-white disabled:opacity-60">{checkingCode ? "Checking…" : "Use code"}</button>
        </div>
        {codeMessage && <p role="status" className="mt-2 text-sm text-leaf-800">{codeMessage}</p>}
      </div>

      {farFromChosen && (
        <p className="flex items-start gap-2 rounded-2xl border border-warning-line bg-warning-soft px-4 py-3 text-sm text-warning" role="status">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          You seem far from this place. You can still send the report; the team will check the location.
        </p>
      )}
      {locationId && openCase && (
        <div className="flex flex-col gap-2 rounded-2xl border border-leaf-300 bg-leaf-50 px-4 py-3 text-sm text-leaf-950" role="status">
          <p className="font-semibold">An open case already exists here.</p>
          <p className="flex flex-wrap items-center gap-2 text-leaf-950/80">
            {issueLabel(openCase.issueType)} · reported {relative(openCase.createdAt)} <StatusBadge status={openCase.status} />
          </p>
          <p className="text-leaf-950/80">If it is the same problem, follow it and you will get its updates. If it is different, you can still report it.</p>
          {follow?.state === "done" ? (
            <p className="font-semibold text-success">You are following this case. You do not need to report it again.</p>
          ) : (
            <button
              type="button"
              onClick={() => void followOpenCase(openCase.reportId)}
              disabled={follow?.state === "saving"}
              className="min-h-11 self-start rounded-full border border-leaf-600 px-5 text-sm font-semibold text-leaf-900 hover:bg-white disabled:opacity-60"
            >
              {follow?.state === "saving" ? "Following…" : "Follow this case"}
            </button>
          )}
          {follow?.message && <p className="font-medium text-danger">{follow.message}</p>}
        </div>
      )}
      {error && (
        <p id="location-error" className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </fieldset>
  );
}
