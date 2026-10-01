"use server";

import { revalidatePath } from "next/cache";
import { getStaffContext, toUserMessage } from "@/features/staff/server";
import type { ActionOutcome } from "@/lib/validation/result";
import { instructionSchema, type InstructionInput } from "./schema";

// Supervisor or higher authority adds an instruction to an open case; the admin and the worker are notified (03 F5.2).
export async function addInstruction(input: InstructionInput): Promise<ActionOutcome> {
  const parsed = instructionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { db, me } = await getStaffContext(["supervisor", "higher_authority"]);
  const { error } = await db.rpc("add_instruction", { p_report: parsed.data.reportId, p_note: parsed.data.note });
  if (error) {
    console.error("addInstruction failed", { userId: me.id, orgId: me.orgId, code: error.code });
    return { ok: false, message: toUserMessage(error.message) };
  }

  revalidatePath("/supervisor");
  revalidatePath("/authority");
  revalidatePath(`/case/${parsed.data.reportId}`);
  return { ok: true };
}
