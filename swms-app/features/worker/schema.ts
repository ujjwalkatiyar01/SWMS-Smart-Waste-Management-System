// Input rules for completing a task (03 F4.4). complete_report re-checks worker, status and photo path.

import { z } from "zod";
import { reasonText } from "@/lib/validation/text";

export const completeSchema = z.object({
  reportId: z.uuid("This task could not be found."),
  photoPath: z.string().min(1, "Add an after-photo to mark the task done."),
  note: z.string().trim().max(1000, "Use 1000 characters or fewer."),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

export type CompleteInput = z.input<typeof completeSchema>;

export type TaskState =
  | { kind: "complete" }
  | { kind: "done"; farFromSite: boolean }
  | { kind: "none" };

export type CompleteResult = { ok: true } | { ok: false; message: string };

export const returnSchema = z.object({ reportId: z.uuid("This task could not be found."), reason: reasonText });
export type ReturnInput = z.input<typeof returnSchema>;
