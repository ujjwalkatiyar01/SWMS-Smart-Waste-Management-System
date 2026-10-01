import type { Metadata } from "next";
import { WorkerLoginForm } from "@/features/auth";
import { getSignUpOptions } from "@/features/auth/server";

export const metadata: Metadata = { title: "Worker login — SWMS" };

export default async function WorkerLoginPage() {
  return <WorkerLoginForm options={await getSignUpOptions()} />;
}
