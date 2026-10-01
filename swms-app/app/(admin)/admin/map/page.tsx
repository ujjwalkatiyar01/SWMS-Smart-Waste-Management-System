import { AdminMap } from "@/features/admin";
import { getMapData } from "@/features/admin/server";
import { getLiveVehicles, LiveVehicles } from "@/features/trips";

export const metadata = { title: "Map · SWMS" };

export default async function AdminMapPage() {
  const [data, vehicles] = await Promise.all([getMapData(), getLiveVehicles()]);
  return (
    <>
      <AdminMap data={data} />
      <div className="mx-auto w-full max-w-5xl pb-8">
        <LiveVehicles initial={vehicles} hint="Vehicles whose driver has started a trip by scanning the vehicle QR code." />
      </div>
    </>
  );
}
