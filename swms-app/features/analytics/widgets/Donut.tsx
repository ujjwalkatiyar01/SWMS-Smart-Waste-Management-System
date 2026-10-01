// Share of a whole (≤ 5 parts) as a ring with the total in the middle and a legend with numbers and %.

import { cn } from "@/lib/utils";
import type { Slice } from "../schema";
import { EmptyChart, SrTable } from "./ChartCard";
import { TONE } from "./tones";

const STROKE: Record<string, string> = {
  leaf: "stroke-leaf-600", lime: "stroke-leaf-300", sky: "stroke-sky-600", amber: "stroke-amber-500",
  danger: "stroke-danger", muted: "stroke-stone-400", ink: "stroke-leaf-900",
};

export function Donut({ slices, centerLabel, caption }: { slices: Slice[]; centerLabel: string; caption: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <EmptyChart />;
  const r = 15.9155; // circumference 100
  const shown = slices.filter((s) => s.value > 0);
  const gap = shown.length > 1 ? 1.2 : 0;
  // Each ring part starts where the previous one ended, from 12 o'clock.
  const arcs = shown.map((s, i) => {
    const before = shown.slice(0, i).reduce((sum, x) => sum + (x.value / total) * 100, 0);
    return { slice: s, part: Math.max(0, (s.value / total) * 100 - gap), offset: 25 - before };
  });
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 42 42" className="size-full" aria-hidden>
          <circle cx="21" cy="21" r={r} fill="none" className="stroke-leaf-50" strokeWidth="6" />
          {arcs.map(({ slice, part, offset }) => (
            <circle key={slice.label} cx="21" cy="21" r={r} fill="none" className={STROKE[slice.tone]} strokeWidth="6"
              strokeDasharray={`${part} ${100 - part}`} strokeDashoffset={offset} strokeLinecap="round" />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold tabular-nums text-leaf-950">{total}</span>
          <span className="text-xs text-leaf-950/60">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", TONE[s.tone].bg)} />
            <span className="min-w-0 flex-1 text-leaf-950/80">{s.label}</span>
            <span className="font-semibold tabular-nums text-leaf-950">{s.value}</span>
            <span className="w-10 text-right tabular-nums text-leaf-950/60">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} columns={["Part", "Count"]} rows={slices.map((s) => [s.label, s.value])} />
    </div>
  );
}
