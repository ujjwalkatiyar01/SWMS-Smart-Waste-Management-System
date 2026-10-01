// Ranked horizontal bars with the label and value written next to each bar (direct labels).

import { cn } from "@/lib/utils";
import type { Slice } from "../schema";
import { EmptyChart, SrTable } from "./ChartCard";
import { TONE } from "./tones";

export function BarList({ items, caption, limit = 6 }: { items: Slice[]; caption: string; limit?: number }) {
  const shown = items.filter((i) => i.value > 0).slice(0, limit);
  if (!shown.length) return <EmptyChart />;
  const max = Math.max(...shown.map((i) => i.value));
  return (
    <div>
      <ul className="flex flex-col gap-3">
        {shown.map((item, i) => (
          <li key={item.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-leaf-950/80" title={item.label}>{item.label}</span>
              <span className="font-semibold tabular-nums text-leaf-950">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-leaf-50">
              <div
                className={cn("h-full origin-left rounded-full animate-bar-in motion-reduce:animate-none", i === 0 ? TONE[item.tone].bg : `${TONE[item.tone].bg} opacity-60`)}
                style={{ width: `${(item.value / max) * 100}%`, animationDelay: `${i * 60}ms` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} columns={["Item", "Count"]} rows={shown.map((s) => [s.label, s.value])} />
    </div>
  );
}
