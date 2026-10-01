import type { Metadata } from "next";
import { LoginForm } from "@/features/auth";

export const metadata: Metadata = { title: "Log in — SWMS" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reason, as } = await searchParams;
  return <LoginForm inactive={reason === "inactive"} audience={as === "admin" ? "admin" : as === "staff" ? "staff" : "resident"} />;
}
