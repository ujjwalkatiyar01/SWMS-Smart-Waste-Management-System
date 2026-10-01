import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PickupDetail } from "@/features/pickups";
import { getPickup } from "@/features/pickups/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";

export const metadata: Metadata = { title: "Pickup — SWMS" };

export default async function PickupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pickup, me] = await Promise.all([getPickup(id), getCurrentUser()]);
  if (!pickup || !me) notFound();
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
    <Link href={ROLE_HOME[me.role]} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-semibold text-leaf-900 hover:bg-leaf-100"><ArrowLeft className="size-4" aria-hidden /> Back</Link>
    <PickupDetail pickup={pickup} />
  </div>;
}
