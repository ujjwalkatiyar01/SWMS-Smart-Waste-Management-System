import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "New password — SWMS" };
export default function UpdatePasswordPage() { return <UpdatePasswordForm />; }
