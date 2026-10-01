import { SupervisorHome } from "@/features/escalations";
import { getSupervisorHome } from "@/features/escalations/server";

export const metadata = { title: "Escalated cases · SWMS" };

export default async function SupervisorPage() {
  return <SupervisorHome data={await getSupervisorHome()} />;
}
