import { Inbox } from "lucide-react";

// Every list shows a helpful empty message (03 §3).
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <Inbox aria-hidden className="size-8 text-leaf-600" />
      <p className="mt-3 font-semibold text-leaf-950">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
