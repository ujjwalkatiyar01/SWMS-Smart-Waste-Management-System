import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth";
import { getSignUpOptions } from "@/features/auth/server";

export const metadata: Metadata = { title: "Sign up — SWMS" };

export default async function SignUpPage() {
  return <SignUpForm options={await getSignUpOptions()} />;
}
