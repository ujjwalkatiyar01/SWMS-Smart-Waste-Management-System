import { SetupPage } from "@/features/setup";
import { getAdminSetup } from "@/features/setup/server";

export const metadata = { title: "Organisation setup — SWMS" };
export default async function AdminSetupPage() { return <SetupPage data={await getAdminSetup()} />; }
