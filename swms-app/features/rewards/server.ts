// Server-only reads for the resident rewards card. Read as the resident: row rules show only their own points.

import "server-only";
import type { Db } from "@/features/staff/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BADGE_TIERS, type RewardsView } from "./schema";

export async function getMyRewards(): Promise<RewardsView | null> {
  const me = await getCurrentUser();
  if (!me) return null;
  const db = (await createClient()) as unknown as Db;
  const [events, profile, board] = await Promise.all([
    db.from("reward_events").select("points, reason"),
    db.from("users").select("show_on_leaderboard, areas!users_area_id_fkey(name)").eq("id", me.id).single(),
    db.rpc("get_leaderboard"),
  ]);
  if (events.error || profile.error) throw new Error("Could not load rewards");

  const verified = events.data.filter((e) => e.reason === "verified_report").length;
  const nextTier = BADGE_TIERS.find((tier) => tier > verified);
  return {
    points: events.data.reduce((sum, e) => sum + e.points, 0),
    verified,
    earned: BADGE_TIERS.filter((tier) => tier <= verified),
    next: nextTier ? { at: nextTier, toGo: nextTier - verified } : null,
    optIn: profile.data.show_on_leaderboard,
    areaName: profile.data.areas?.name ?? null,
    board: (board.data ?? []).map((row) => ({ firstName: row.first_name, points: Number(row.points) })),
  };
}
