import { z } from "zod";
import type { PickupStatus, Role } from "@/types/domain";

export const pickupFields = z.object({
  wasteType: z.enum(["wet", "dry", "hazardous", "bulky", "e_waste"], "Choose a waste type."),
  preferredDate: z.iso.date("Choose a valid date."),
  slot: z.enum(["morning", "afternoon"], "Choose a time slot."),
  address: z.string().trim().min(1, "Enter the pickup address.").max(300, "Use 300 characters or fewer."),
  note: z.string().trim().max(1000, "Use 1000 characters or fewer."),
});
export const createPickupSchema = pickupFields.extend({ id: z.uuid() });
export const editPickupSchema = pickupFields.extend({ id: z.uuid() });
export const pickupIdSchema = z.uuid();
export const schedulePickupSchema = z.object({ id: z.uuid(), date: z.iso.date(), slot: z.enum(["morning", "afternoon"]), workerId: z.uuid().nullable() });
export const reasonSchema = z.object({ id: z.uuid(), reason: z.string().trim().min(1, "Add a reason.").max(1000) });
export const collectSchema = z.object({ id: z.uuid(), segregationOk: z.boolean() });

export type PickupFields = z.input<typeof pickupFields>;
export type CreatePickupInput = z.input<typeof createPickupSchema>;
export type EditPickupInput = z.input<typeof editPickupSchema>;
export type PickupActionResult = { ok: true; id: string } | { ok: false; message: string; fieldErrors?: Partial<Record<keyof PickupFields, string>> };

export interface PickupListItem {
  id: string;
  wasteType: string;
  status: PickupStatus;
  preferredDate: string;
  slot: string;
  address: string | null;
}

export interface PickupDetail extends PickupListItem {
  note: string | null;
  declineReason: string | null;
  refuseReason: string | null;
  segregationOk: boolean | null;
  photoUrl: string | null;
  requesterId: string;
  assignedWorkerId: string | null;
  viewerId: string;
  viewerRole: Role;
  policy: string;
  linkedReportId: string | null;
  events: { id: string; type: string; at: string; note: string | null; oldDate: string | null; oldSlot: string | null }[];
  workers: { id: string; name: string }[];
}
