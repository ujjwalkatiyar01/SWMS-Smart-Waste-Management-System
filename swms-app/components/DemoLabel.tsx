import { cn } from "@/lib/utils";

/** "Demo data" label shown on every page (03-FULL-APP-FLOW §3). */
export function DemoLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
      Demo data
    </span>
  );
}
