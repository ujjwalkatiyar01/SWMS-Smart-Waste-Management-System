"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelDuty } from "../actions";

export function CancelDutyButton({ dutyId }: { dutyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function cancel() {
    if (busy || !window.confirm("Cancel this duty? The worker is told.")) return;
    setBusy(true);
    const result = await cancelDuty(dutyId).catch(() => ({ ok: false as const, message: "Could not cancel. Try again." }));
    setBusy(false);
    if (result.ok) router.refresh();
    else setError(result.message);
  }
  return (
    <span className="flex flex-col items-end gap-1">
      <button type="button" onClick={() => void cancel()} disabled={busy}
        className="min-h-11 rounded-full border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-60">
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
