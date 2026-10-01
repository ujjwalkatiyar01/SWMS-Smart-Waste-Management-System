import { AuthorityAnalytics, parseRange } from "@/features/analytics";
import { getAuthorityAnalytics } from "@/features/analytics/server";
import { AuthorityHome } from "@/features/escalations";
import { getAuthorityHome } from "@/features/escalations/server";

export const metadata = { title: "Level-2 escalations · SWMS" };

export default async function AuthorityPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const [data, analytics] = await Promise.all([getAuthorityHome(), getAuthorityAnalytics(range)]);
  return (
    <>
      <AuthorityHome data={data} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6">
        <AuthorityAnalytics data={analytics} />
      </div>
    </>
  );
}
