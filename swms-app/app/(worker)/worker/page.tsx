import { getCurrentUser } from "@/lib/auth/session";
import { parseRange, WorkerAnalytics } from "@/features/analytics";
import { getWorkerAnalytics } from "@/features/analytics/server";
import { CheckInCard, MyDuties } from "@/features/duties";
import { getMyCheckIn, getMyDuties } from "@/features/duties/server";
import { DriverTrip, getLiveVehicles, LiveVehicles } from "@/features/trips";
import { getMyTrip } from "@/features/trips/server";
import { WorkerHome } from "@/features/worker";
import { getWorkerHome } from "@/features/worker/server";

export const metadata = { title: "Today's work · SWMS" };

export default async function WorkerPage({ searchParams }: { searchParams: Promise<{ area?: string; range?: string }> }) {
  const { area, range } = await searchParams;
  const me = await getCurrentUser();
  const [data, trip, vehicles, duties, checkIn, analytics] = await Promise.all([
    getWorkerHome(area), getMyTrip(), getLiveVehicles(), getMyDuties(), getMyCheckIn(), getWorkerAnalytics(parseRange(range)),
  ]);
  return (
    <div className="flex flex-col gap-12">
    <WorkerHome
      data={data}
      duties={<MyDuties duties={duties} />}
      side={
        <>
          <CheckInCard current={checkIn} areas={data.areas} homeAreaName={data.homeAreaName} />
          {me?.workerType === "driver" && <DriverTrip trip={trip} areas={data.areas} homeAreaId={data.homeAreaId} />}
          <LiveVehicles initial={vehicles} hint="Find your team's vehicle before you meet it at a pickup or a cleaned spot." />
        </>
      }
    />
    <div className="mx-auto w-full max-w-7xl">
      <WorkerAnalytics data={analytics} />
    </div>
    </div>
  );
}
