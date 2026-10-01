import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PickupForm } from "@/features/pickups";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";

export const metadata: Metadata = { title: "Request a pickup — SWMS" };

export default async function NewPickupPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "resident" && me.role !== "admin") redirect(ROLE_HOME[me.role]);
  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
    <Link href={ROLE_HOME[me.role]} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-3 font-semibold text-leaf-900 hover:bg-leaf-100"><ArrowLeft className="size-4" aria-hidden /> Back</Link>
    <div><p className="eyebrow text-leaf-800">New request</p><h1 className="mt-1 text-3xl font-extrabold text-leaf-950">Request a <span className="accent-serif text-leaf-700">pickup</span></h1>
      <p className="mt-1 text-ui text-leaf-950/80">Choose the waste type, date, time slot and address.</p></div>
    <PickupForm />
  </div>;
}
