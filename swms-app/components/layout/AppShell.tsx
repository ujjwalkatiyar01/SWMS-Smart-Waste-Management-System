// Page frame for every role area: header + main. Sends anyone without an active session to /login
// (proxy.ts does this first; this is the server-side check for the rendered page).

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { getNotifications } from "@/features/notifications/server";
import { AppHeader } from "./AppHeader";

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await getNotifications();
  return (
    <>
      <AppHeader user={user} notifications={notifications} />
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 lg:py-10">
        {children}
      </main>
    </>
  );
}
