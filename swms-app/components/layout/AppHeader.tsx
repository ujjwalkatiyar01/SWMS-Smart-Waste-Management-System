// Header for every logged-in screen: logo to the role home, who is logged in, and log out.

import { UserRound } from "lucide-react";
import { DemoLabel } from "@/components/shared/DemoLabel";
import { Logo } from "@/components/shared/Logo";
import { logout } from "@/features/auth";
import { NotificationBell } from "@/features/notifications";
import type { NotificationItem } from "@/features/notifications/schema";
import { firstName, type CurrentUser } from "@/lib/auth/session";
import { ROLE_HOME, roleLabel } from "@/lib/roles";
import { LogoutButton } from "./LogoutButton";

export function AppHeader({ user, notifications }: { user: CurrentUser; notifications: NotificationItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-leaf-100 bg-cream/90 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-18">
        <div className="flex items-center gap-3">
          <Logo href={ROLE_HOME[user.role]} className="w-[104px] lg:w-[128px]" />
          <DemoLabel className="hidden sm:inline-flex" />
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <NotificationBell items={notifications} />
          <p className="flex items-center gap-2 text-sm">
            <UserRound className="hidden size-4 text-leaf-700 sm:block" aria-hidden />
            <span className="font-semibold text-leaf-950">{firstName(user.name)}</span>
            <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-semibold text-leaf-800">{roleLabel(user.role, user.workerType)}</span>
          </p>
          <form action={logout}>
            <LogoutButton />
          </form>
        </div>
      </div>
    </header>
  );
}
