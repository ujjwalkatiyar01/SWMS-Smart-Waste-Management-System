// Contract of worker duties and work-area check-in (1100): the admin plans duties per date, the worker
// starts each one on its day and finishes it with an after-photo.

import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 07:30.");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const position = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable();

export const createDutiesSchema = z
  .object({
    workerId: z.uuid("Choose a worker."),
    areaId: z.uuid("Choose the work area."),
    locationId: z.uuid().nullable(),
    task: z.string().trim().min(3, "Describe the task.").max(500, "Use 500 characters or fewer."),
    dates: z.array(day).min(1, "Choose at least one day.").max(31),
    start: time,
    end: time,
  })
  .refine((v) => v.end > v.start, { path: ["end"], message: "The shift must end after it starts." });

export const startDutySchema = z.object({ dutyId: z.uuid(), position });

export const completeDutySchema = z.object({
  dutyId: z.uuid(),
  photoPath: z.string().min(1, "Add an after-photo."),
  note: z.string().trim().max(1000, "Use 1000 characters or fewer."),
  position,
});

export type CreateDutiesInput = z.input<typeof createDutiesSchema>;
export type StartDutyInput = z.input<typeof startDutySchema>;
export type CompleteDutyInput = z.input<typeof completeDutySchema>;

/** Stored status plus "missed": still scheduled after the shift ended (worked out when read). */
export type DutyStatus = "scheduled" | "in_progress" | "done" | "cancelled" | "missed";

export interface Duty {
  id: string;
  date: string;
  start: string;
  end: string;
  task: string;
  areaName: string;
  placeName: string | null;
  status: DutyStatus;
  isToday: boolean;
  startedAt: string | null;
  doneAt: string | null;
  doneNote: string | null;
  photoUrl: string | null;
}

export interface AdminDuty extends Duty {
  workerName: string;
  workerType: string | null;
}

export interface CheckIn {
  workerName?: string;
  areaName: string;
  at: string;
}

export interface DutyFormOptions {
  workers: { id: string; name: string; workerType: string | null; areaId: string | null }[];
  areas: { id: string; name: string }[];
  /** Places sorted by heavy waste first (latest risk score, then open cases). */
  places: { id: string; name: string; areaId: string | null; risk: number | null; open: number }[];
}
