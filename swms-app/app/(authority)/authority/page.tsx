import { AuthorityHome } from "@/features/escalations";
import { getAuthorityHome } from "@/features/escalations/server";

export const metadata = { title: "Level-2 escalations · SWMS" };

export default async function AuthorityPage() {
  return <AuthorityHome data={await getAuthorityHome()} />;
}
