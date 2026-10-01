import { AdminDashboard } from "@/features/admin";
import { getAdminDashboard } from "@/features/admin/server";

export const metadata = { title: "Admin dashboard · SWMS" };

export default async function AdminPage() {
  return <AdminDashboard data={await getAdminDashboard()} />;
}
