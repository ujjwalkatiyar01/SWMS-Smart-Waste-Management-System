import { getCurrentUser } from "@/lib/auth/session";
import { CheckInCard, MyDuties } from "@/features/duties";
import { getMyCheckIn, getMyDuties } from "@/features/duties/server";
import { DriverTrip, getLiveVehicles, LiveVehicles } from "@/features/trips";
import { getMyTrip } from "@/features/trips/server";
import { WorkerHome } from "@/features/worker";
import { getWorkerHome } from "@/features/worker/server";

export const metadata = { title: "Today's work · SWMS" };

export default async function WorkerPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const me = await getCurrentUser();
  const [data, trip, vehicles, duties, checkIn] = await Promise.all([
    getWorkerHome(area), getMyTrip(), getLiveVehicles(), getMyDuties(), getMyCheckIn(),
  ]);
  return (
    <WorkerHome
      data={data}
      tracking={
        <>
          <CheckInCard current={checkIn} areas={data.areas} homeAreaName={data.homeAreaName} />
          <MyDuties duties={duties} />
          {me?.workerType === "driver" && <DriverTrip trip={trip} areas={data.areas} homeAreaId={data.homeAreaId} />}
          <LiveVehicles initial={vehicles} hint="Find your team's vehicle before you meet it at a pickup or a cleaned spot." />
        </>
      }
    />
  );
}
