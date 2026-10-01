// Dashboard frame for admins and workers: left sidebar menu, top bar, then the page. Same session check as
// AppShell (proxy.ts redirects first; this is the server-side check for the rendered page).

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { DemoLabel } from "@/components/shared/DemoLabel";
import { Logo } from "@/components/shared/Logo";
import { getNotifications } from "@/features/notifications/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/roles";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

export async function DashboardShell({ role, children }: { role: "admin" | "worker"; children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const notifications = await getNotifications();
  return (
    <div className="flex min-h-dvh w-full flex-1 bg-cream">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-leaf-100 bg-white px-4 py-5 lg:flex">
        <Logo href={ROLE_HOME[user.role]} className="w-[132px] px-2" />
        <div className="flex-1 overflow-y-auto pb-20">
          <SidebarNav role={role} layout="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-leaf-100 bg-white/90 backdrop-blur-md">
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold">
            Skip to main content
          </a>
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Logo href={ROLE_HOME[user.role]} className="w-[104px] lg:hidden" />
              <DemoLabel className="hidden sm:inline-flex" />
            </div>
            <UserMenu user={user} notifications={notifications} />
          </div>
          <div className="lg:hidden">
            <SidebarNav role={role} layout="row" />
          </div>
        </header>
        <main id="main" className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
