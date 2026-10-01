import { notFound } from "next/navigation";
import { LocationHistory } from "@/features/admin";
import { getLocationHistory } from "@/features/admin/server";

export const metadata = { title: "Place · SWMS" };

export default async function LocationPage({ params }: PageProps<"/admin/location/[id]">) {
  const data = await getLocationHistory((await params).id);
  if (!data) notFound();
  return <LocationHistory data={data} />;
}
