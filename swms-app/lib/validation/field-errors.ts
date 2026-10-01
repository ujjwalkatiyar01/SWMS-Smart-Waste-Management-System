import type { z } from "zod";

/** First message per field, in the shape the forms show under each input. */
export function firstErrors<Field extends string>(error: z.ZodError): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as Field;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
