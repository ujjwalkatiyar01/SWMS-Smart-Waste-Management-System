"use client";

// Dashboard menu for admins and workers: a left sidebar on large screens, a scrolling row on phones.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock, ClipboardList, LayoutDashboard, ListChecks, ListFilter, Map as MapIcon, MapPinned, Package, QrCode, Route, Settings, Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof LayoutDashboard };
type Group = { title?: string; items: Item[] };

const MENUS: Record<"admin" | "worker", Group[]> = {
  admin: [
    { items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/cases", label: "All cases", icon: ListFilter },
      { href: "/admin/map", label: "Map", icon: MapIcon },
    ] },
    { title: "Operations", items: [
      { href: "/admin/duties", label: "Duty roster", icon: CalendarClock },
      { href: "/admin/trips", label: "Vehicle trips", icon: Route },
    ] },
    { title: "Organisation", items: [
      { href: "/admin/setup", label: "Setup", icon: Settings },
      { href: "/admin/setup/qr", label: "QR codes", icon: QrCode },
    ] },
  ],
  worker: [
    { items: [
      { href: "/worker", label: "Today", icon: LayoutDashboard },
      { href: "/worker#duties-title", label: "My duties", icon: ListChecks },
      { href: "/worker#todo-title", label: "Tasks", icon: ClipboardList },
      { href: "/worker#pickups-title", label: "Pickups", icon: Package },
    ] },
    { title: "On the road", items: [
      { href: "/worker#checkin-title", label: "Work area", icon: MapPinned },
      { href: "/worker#vehicles-title", label: "Live vehicles", icon: Truck },
    ] },
  ],
};

/** The longest matching path is the current page, so /admin/setup/qr does not also light up Setup. */
function activeHref(pathname: string, items: Item[]) {
  return items
    .map((i) => i.href)
    .filter((h) => !h.includes("#") && (pathname === h || pathname.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0];
}

export function SidebarNav({ role, layout }: { role: "admin" | "worker"; layout: "sidebar" | "row" }) {
  const pathname = usePathname();
  const groups = MENUS[role];
  const current = activeHref(pathname, groups.flatMap((g) => g.items));

  if (layout === "row") {
    return (
      <nav aria-label="Dashboard menu" className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
        {groups.flatMap((g) => g.items).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={href === current ? "page" : undefined}
            className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
              href === current ? "border-leaf-700 bg-leaf-100 text-leaf-900" : "border-leaf-200 bg-white text-leaf-950/80")}>
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Dashboard menu" className="flex flex-col gap-5">
      {groups.map((group, i) => (
        <div key={i} className={cn(i > 0 && "border-t border-leaf-100 pt-4")}>
          {group.title && <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-leaf-950/50">{group.title}</p>}
          <ul className="flex flex-col gap-1">
            {group.items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} aria-current={href === current ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-ui font-semibold transition-colors",
                    href === current ? "bg-leaf-100 text-leaf-900" : "text-leaf-950/75 hover:bg-leaf-50 hover:text-leaf-950")}>
                  <Icon className="size-[18px]" aria-hidden /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
