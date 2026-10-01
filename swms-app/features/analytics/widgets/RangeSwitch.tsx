"use client";

// "Last 7 / 14 / 30 days" — kept in the URL (?range=) so a refresh or shared link shows the same view.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANGES, type RangeDays } from "../schema";

export function RangeSwitch({ range }: { range: RangeDays }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const href = (r: number) => {
    const next = new URLSearchParams(params);
    if (r === 7) next.delete("range");
    else next.set("range", String(r));
    const q = next.toString();
    return `${pathname}${q ? `?${q}` : ""}`;
  };
  return (
    <nav aria-label="Analytics period" className="flex items-center gap-1 rounded-full border border-leaf-900/10 bg-white p-1 shadow-card">
      <CalendarRange className="ml-2 size-4 text-leaf-700" aria-hidden />
      {RANGES.map((r) => (
        <Link
          key={r}
          href={href(r)}
          scroll={false}
          replace
          aria-current={r === range ? "true" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold transition-colors sm:px-4",
            r === range ? "bg-leaf-900 text-white" : "text-leaf-950/70 hover:bg-leaf-50",
          )}
        >
          {r} days
        </Link>
      ))}
    </nav>
  );
}
