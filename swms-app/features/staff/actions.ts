"use server";

import { revalidatePath } from "next/cache";
import type { ActionOutcome } from "@/lib/validation/result";
import { delayNoteSchema, type DelayNoteInput } from "./schema";
import { getStaffContext, toUserMessage } from "./server";

// Admin or the assigned worker records why an overdue case is late and what happens next; the due time stays (R5).
export async function addDelayNote(input: DelayNoteInput): Promise<ActionOutcome> {
  const parsed = delayNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { db, me } = await getStaffContext(["admin", "worker"]);
  const { error } = await db.rpc("add_delay_note", {
    p_report: parsed.data.reportId,
    p_reason: parsed.data.reason,
    p_next_step: parsed.data.nextStep,
  });
  if (error) {
    console.error("addDelayNote failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }

  revalidatePath("/admin");
  revalidatePath("/worker");
  revalidatePath(`/case/${parsed.data.reportId}`);
  return { ok: true };
}
