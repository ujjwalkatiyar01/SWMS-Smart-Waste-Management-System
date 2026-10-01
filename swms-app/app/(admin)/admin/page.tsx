import { AdminDashboard } from "@/features/admin";
import { getAdminDashboard } from "@/features/admin/server";
import { AdminAnalytics, parseRange } from "@/features/analytics";
import { getAdminAnalytics } from "@/features/analytics/server";

export const metadata = { title: "Admin dashboard · SWMS" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const [data, analytics] = await Promise.all([getAdminDashboard(), getAdminAnalytics(range)]);
  return (
    <div className="flex flex-col gap-12">
      <AdminDashboard data={data} />
      <div className="mx-auto w-full max-w-7xl">
        <AdminAnalytics data={analytics} />
      </div>
    </div>
  );
}
