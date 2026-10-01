import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextCollection } from "@/features/pickups";
import { getMyPickups, getNextCollection } from "@/features/pickups/server";
import { MyReports } from "@/features/reports";
import { getFollowedCases, getMyReports } from "@/features/reports/server";
import { RewardsCard } from "@/features/rewards";
import { getMyRewards } from "@/features/rewards/server";
import { firstName, getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";

export const metadata: Metadata = { title: "My reports — SWMS" };

export default async function MyPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "resident") redirect(ROLE_HOME[me.role]);
  const [reports, pickups, followed, rewards, next] = await Promise.all([
    getMyReports(),
    getMyPickups(),
    getFollowedCases(),
    getMyRewards(),
    getNextCollection(),
  ]);
  return (
    <MyReports
      firstName={firstName(me.name)}
      reports={reports}
      pickups={pickups}
      followed={followed}
      aboveLists={
        <>
          <NextCollection next={next} />
          {rewards && <RewardsCard rewards={rewards} />}
        </>
      }
    />
  );
}
