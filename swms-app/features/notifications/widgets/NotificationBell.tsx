"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/time";
import { markNotificationRead } from "../actions";
import type { NotificationItem } from "../schema";

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) router.refresh(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [router]);
  const unread = items.filter((item) => !item.readAt).length;
  return (
    <details className="relative">
      <summary className="relative flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-leaf-900 transition-colors hover:bg-leaf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-700 [&::-webkit-details-marker]:hidden" aria-label={`Notifications, ${unread} unread`}>
        <Bell className="size-5" aria-hidden />
        {unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-leaf-700 px-1.5 text-xs font-bold text-white">{unread}</span>}
      </summary>
      <div className="absolute right-0 top-12 z-50 max-h-96 w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-leaf-900/10 bg-cream p-4 shadow-card">
        <h2 className="text-lg font-bold text-leaf-950">Notifications</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-leaf-950/80">No notifications yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-leaf-900/10">
            {items.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-start gap-2">
                  {!item.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-leaf-700" aria-label="Unread" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed text-leaf-950">{item.message}</p>
                    <p className="mt-1 text-xs text-leaf-950/70">{formatDateTime(item.createdAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
                      {item.href && <Link className="text-leaf-800 underline-offset-4 hover:underline" href={item.href}>Open</Link>}
                      {!item.readAt && (
                        <form action={markNotificationRead}>
                          <input type="hidden" name="id" value={item.id} />
                          <button className="text-leaf-800 underline-offset-4 hover:underline" type="submit">Mark read</button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
