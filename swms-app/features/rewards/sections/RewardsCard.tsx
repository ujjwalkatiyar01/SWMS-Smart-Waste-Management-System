// Resident rewards (05-AI-SPEC A8): points only for verified reports, badges at 10 / 30 / 50, no cash.

import { Award, Trophy } from "lucide-react";
import { BADGE_TIERS, type RewardsView } from "../schema";
import { LeaderboardToggle } from "../widgets/LeaderboardToggle";

export function RewardsCard({ rewards }: { rewards: RewardsView }) {
  return (
    <section aria-labelledby="rewards-title" className="flex flex-col gap-5 rounded-[1.75rem] border border-leaf-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="rewards-title" className="text-xl font-bold text-leaf-950">Your points</h2>
          <p className="mt-1 text-sm text-muted-foreground">Points are given only for verified reports. They are not cash.</p>
        </div>
        <p className="text-right">
          <span className="block text-3xl font-extrabold tabular-nums text-leaf-900">{rewards.points}</span>
          <span className="text-sm text-muted-foreground">{rewards.verified} verified {rewards.verified === 1 ? "report" : "reports"}</span>
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Badges">
        {BADGE_TIERS.map((tier) => {
          const earned = rewards.earned.includes(tier);
          return (
            <li
              key={tier}
              className={
                earned
                  ? "inline-flex items-center gap-2 rounded-full bg-lime-soft px-4 py-2 text-sm font-bold text-leaf-950"
                  : "inline-flex items-center gap-2 rounded-full border border-dashed border-leaf-300 px-4 py-2 text-sm text-muted-foreground"
              }
            >
              <Award className="size-4" aria-hidden /> {tier} verified reports <span className="sr-only">{earned ? "— earned" : "— not yet earned"}</span>
              {earned && <span aria-hidden>✓</span>}
            </li>
          );
        })}
      </ul>
      {rewards.next ? (
        <p className="text-sm text-leaf-950/80">
          {rewards.next.toGo} more verified {rewards.next.toGo === 1 ? "report" : "reports"} for the {rewards.next.at}-report badge.
        </p>
      ) : (
        <p className="text-sm font-semibold text-leaf-950">You have earned every badge. Thank you!</p>
      )}

      <div className="flex flex-col gap-3 border-t border-leaf-100 pt-4">
        <h3 className="flex items-center gap-2 font-semibold text-leaf-950">
          <Trophy className="size-4 text-leaf-700" aria-hidden /> {rewards.areaName ?? "Area"} leaderboard
        </h3>
        {rewards.board.length ? (
          <ol className="flex flex-col gap-1.5">
            {rewards.board.map((row, i) => (
              <li key={`${row.firstName}-${i}`} className="flex items-center justify-between rounded-xl bg-leaf-50 px-4 py-2 text-ui">
                <span className="font-medium text-leaf-950">{i + 1}. {row.firstName}</span>
                <span className="tabular-nums text-leaf-900">{row.points} points</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Nobody in your area has joined the leaderboard yet.</p>
        )}
        <LeaderboardToggle initial={rewards.optIn} />
      </div>
    </section>
  );
}
