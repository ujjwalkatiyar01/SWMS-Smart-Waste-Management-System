import { AdminMap } from "@/features/admin";
import { getMapData } from "@/features/admin/server";

export const metadata = { title: "Map · SWMS" };

export default async function AdminMapPage() {
  return <AdminMap data={await getMapData()} />;
}
