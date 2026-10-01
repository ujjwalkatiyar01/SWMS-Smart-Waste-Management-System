import { z } from "zod";
import { TripHistory } from "@/features/trips";
import { getTripHistory, getTripRoute } from "@/features/trips/server";
import { getStaffContext } from "@/features/staff/server";

export const metadata = { title: "Vehicle trips · SWMS" };

export default async function AdminTripsPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  await getStaffContext(["admin"]);
  const { trip } = await searchParams;
  const trips = await getTripHistory(7);
  const selected = z.uuid().safeParse(trip).success && trips.some((t) => t.tripId === trip) ? trip! : trips[0]?.tripId ?? null;
  return <TripHistory trips={trips} selected={selected} route={selected ? await getTripRoute(selected) : []} />;
}
