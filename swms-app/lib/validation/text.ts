import { z } from "zod";

/** A required free-text reason or note (limits match the database checks, 06 S3). */
export const reasonText = z.string().trim().min(1, "Please add a reason.").max(1000, "Use 1000 characters or fewer.");
