// White card with a title row for dashboard grids (title left, optional action right).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardCard({ id, title, hint, action, className, children }: {
  id: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("rounded-2xl border border-leaf-100 bg-white p-5 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-bold text-leaf-950">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
