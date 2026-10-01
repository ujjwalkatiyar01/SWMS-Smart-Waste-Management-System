"use client";

// Opt in or out of the area leaderboard (default hidden, 05-AI-SPEC A8).

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { setLeaderboardOptIn } from "../actions";

export function LeaderboardToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const id = useId();
  const [checked, setChecked] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function change(next: boolean) {
    if (pending) return;
    setPending(true);
    setError(undefined);
    setChecked(next);
    try {
      const result = await setLeaderboardOptIn(next);
      if (result.ok) router.refresh();
      else {
        setChecked(!next);
        setError(result.message);
      }
    } catch {
      setChecked(!next);
      setError("Could not save your choice. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-ui text-leaf-950">
        <input id={id} type="checkbox" checked={checked} disabled={pending} onChange={(e) => void change(e.target.checked)} className="size-5 accent-leaf-700" />
        Show my first name and points on my area&apos;s leaderboard
      </label>
      <p role="alert" className="text-sm font-medium text-danger">{error}</p>
    </div>
  );
}
