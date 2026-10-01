"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionOutcome } from "@/lib/validation/result";
import { optInSchema } from "./schema";

// A resident chooses whether their first name, area and points appear on the area leaderboard (default: hidden).
export async function setLeaderboardOptIn(optIn: boolean): Promise<ActionOutcome> {
  const me = await getCurrentUser();
  if (!me || me.role !== "resident") return { ok: false, message: "You can't do this." };
  const parsed = optInSchema.safeParse({ optIn });
  if (!parsed.success) return { ok: false, message: "Something went wrong. Please try again." };

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ show_on_leaderboard: parsed.data.optIn }).eq("id", me.id);
  if (error) {
    console.error("setLeaderboardOptIn failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: "Could not save your choice. Please try again." };
  }
  revalidatePath("/my");
  return { ok: true };
}
