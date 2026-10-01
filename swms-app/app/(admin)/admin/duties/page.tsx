import { AdminDuties } from "@/features/duties";
import { getAdminDuties } from "@/features/duties/server";
import { orgDay } from "@/lib/time";

export const metadata = { title: "Duty roster · SWMS" };

export default async function AdminDutiesPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  const chosen = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : orgDay();
  return <AdminDuties data={await getAdminDuties(chosen)} />;
}
