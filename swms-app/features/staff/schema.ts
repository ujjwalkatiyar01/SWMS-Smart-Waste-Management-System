// Input rules for actions shared by several staff roles.

import { z } from "zod";
import { reasonText } from "@/lib/validation/text";

export const delayNoteSchema = z.object({
  reportId: z.uuid("This case could not be found."),
  reason: reasonText,
  nextStep: z.string().trim().min(1, "Add the next step.").max(1000, "Use 1000 characters or fewer."),
});

export type DelayNoteInput = z.input<typeof delayNoteSchema>;
