// Citizen rewards (05-AI-SPEC A8): points and badges for verified reports, opt-in area leaderboard, no cash.

import { z } from "zod";

/** Badge tiers in verified reports (05-AI-SPEC A8, demo values). */
export const BADGE_TIERS = [10, 30, 50] as const;

export const optInSchema = z.object({ optIn: z.boolean() });

export interface RewardsView {
  points: number;
  verified: number;
  earned: number[];
  next: { at: number; toGo: number } | null;
  optIn: boolean;
  areaName: string | null;
  board: { firstName: string; points: number }[];
}
