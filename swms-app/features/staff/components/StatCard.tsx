import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Tone colours the number and the icon chip; the card itself stays white (dashboard card style).
const TONE = {
  plain: { value: "text-leaf-950", chip: "bg-leaf-100 text-leaf-800", border: "border-leaf-100" },
  warning: { value: "text-warning", chip: "bg-warning-soft text-warning", border: "border-warning-line" },
  danger: { value: "text-danger", chip: "bg-danger-soft text-danger", border: "border-danger/30" },
};

export function StatCard({ label, value, tone = "plain", href, icon: Icon, hint }: {
  label: string;
  value: number;
  tone?: keyof typeof TONE;
  href?: string;
  icon?: LucideIcon;
  /** Small line under the number, e.g. what the count means. */
  hint?: string;
}) {
  const look = TONE[tone];
  const body = (
    <>
      <dt className="flex items-center justify-between gap-2 text-sm font-semibold text-leaf-950">
        {label}
        {Icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", look.chip)}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </dt>
      <dd className={cn("mt-2 text-3xl font-extrabold tabular-nums", look.value)}>{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
    </>
  );
  const classes = cn("block rounded-2xl border bg-white p-4 shadow-card", look.border);
  return href ? (
    <Link href={href} className={cn(classes, "transition-shadow hover:shadow-float")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export function StatGrid({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {children}
    </dl>
  );
}
