import { cn } from "@/lib/utils";

/** "Demo data" label shown on every page (03-FULL-APP-FLOW §3). */
export function DemoLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-warning-line bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-warning" />
      Demo data
    </span>
  );
}
