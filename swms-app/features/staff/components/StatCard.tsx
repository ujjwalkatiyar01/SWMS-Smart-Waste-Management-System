import Link from "next/link";
import { cn } from "@/lib/utils";

const TONE = {
  plain: "border-border bg-card text-leaf-950",
  warning: "border-warning-line bg-warning-soft text-warning",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export function StatCard({ label, value, tone = "plain", href }: { label: string; value: number; tone?: keyof typeof TONE; href?: string }) {
  const body = (
    <>
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="mt-1 text-3xl font-extrabold tabular-nums">{value}</dd>
    </>
  );
  const classes = cn("block rounded-2xl border p-4", TONE[tone]);
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
    <dl aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {children}
    </dl>
  );
}
