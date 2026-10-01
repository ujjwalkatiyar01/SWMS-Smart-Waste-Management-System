// Notification bell, who is logged in and log out — shared by the page header and the dashboard top bar.

import { UserRound } from "lucide-react";
import { logout } from "@/features/auth";
import { NotificationBell } from "@/features/notifications";
import type { NotificationItem } from "@/features/notifications/schema";
import { firstName, type CurrentUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/roles";
import { LogoutButton } from "./LogoutButton";

export function UserMenu({ user, notifications }: { user: CurrentUser; notifications: NotificationItem[] }) {
  return (
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
  );
}
