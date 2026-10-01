import { parseRange, SupervisorAnalytics } from "@/features/analytics";
import { getSupervisorAnalytics } from "@/features/analytics/server";
import { SupervisorHome } from "@/features/escalations";
import { getSupervisorHome } from "@/features/escalations/server";

export const metadata = { title: "Escalated cases · SWMS" };

export default async function SupervisorPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const [data, analytics] = await Promise.all([getSupervisorHome(), getSupervisorAnalytics(range)]);
  return (
    <>
      <SupervisorHome data={data} />
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <SupervisorAnalytics data={analytics} />
      </div>
    </>
  );
}
