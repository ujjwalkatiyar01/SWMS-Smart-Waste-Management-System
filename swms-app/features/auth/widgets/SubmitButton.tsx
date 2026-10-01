import { ArrowRight, Loader2 } from "lucide-react";

export function SubmitButton({ pending, pendingLabel, label }: { pending: boolean; pendingLabel: string; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="group relative mt-1 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-cta transition-[transform,background-color,opacity] duration-200 hover:bg-leaf-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
    >
      {/* Glass sheen that sweeps across on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:translate-x-[420%] group-hover:opacity-100"
      />
      {pending ? pendingLabel : label}
      {pending ? (
        <Loader2 className="size-5 animate-spin" aria-hidden />
      ) : (
        <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
      )}
    </button>
  );
}
