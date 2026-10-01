// Contract of live vehicle tracking (0900; 03 F7): a driver's running trip and the vehicles others can see.

import { z } from "zod";

const position = {
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().min(0).max(100_000).nullable(),
};

export const startTripSchema = z.object({
  code: z.string().trim().min(16, "Scan the vehicle's QR code or type the code printed under it.").max(80),
  scanMethod: z.enum(["camera", "typed"]),
  // "From where to where" (1100): the area the trip starts in and the area it is going to.
  fromAreaId: z.uuid("Choose where the trip starts."),
  toAreaId: z.uuid("Choose where the trip is going."),
  position: z.object(position).nullable(),
});

export const positionSchema = z.object({ tripId: z.uuid(), ...position });

export const endTripSchema = z.object({ tripId: z.uuid(), position: z.object(position).nullable() });

export type StartTripInput = z.input<typeof startTripSchema>;
export type PositionInput = z.input<typeof positionSchema>;
export type EndTripInput = z.input<typeof endTripSchema>;

export type StartTripResult = { ok: true; tripId: string } | { ok: false; message: string };

export interface MyTrip {
  id: string;
  vehicleNumber: string;
  startedAt: string;
  lastSeenAt: string | null;
  fromArea: string | null;
  toArea: string | null;
}

export interface LiveVehicle {
  tripId: string;
  vehicleNumber: string;
  vehicleKind: string;
  /** Staff only; null for residents. */
  driverFirstName: string | null;
  lat: number;
  lng: number;
  accuracyM: number | null;
  lastSeenAt: string;
  isMine: boolean;
  fromArea: string | null;
  toArea: string | null;
}

export interface TripArea {
  id: string;
  name: string;
}

export interface TripHistoryRow {
  tripId: string;
  vehicleNumber: string;
  driverName: string;
  fromArea: string | null;
  toArea: string | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  distanceM: number;
  points: number;
}
