import { WorkerHome } from "@/features/worker";
import { getWorkerHome } from "@/features/worker/server";

export const metadata = { title: "Today's work · SWMS" };

export default async function WorkerPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  return <WorkerHome data={await getWorkerHome(area)} />;
}
