import { z } from "zod";
import { reasonText } from "@/lib/validation/text";

export const instructionSchema = z.object({ reportId: z.uuid("This case could not be found."), note: reasonText });
export type InstructionInput = z.input<typeof instructionSchema>;
