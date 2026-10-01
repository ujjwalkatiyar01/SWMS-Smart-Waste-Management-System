import { AdminCases, parseCaseFilters } from "@/features/admin";
import { getAdminCases } from "@/features/admin/server";

export const metadata = { title: "All cases · SWMS" };

export default async function AdminCasesPage({ searchParams }: PageProps<"/admin/cases">) {
  const filters = parseCaseFilters(await searchParams);
  return <AdminCases data={await getAdminCases(filters)} filters={filters} />;
}
