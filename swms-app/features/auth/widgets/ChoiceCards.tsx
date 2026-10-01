"use client";

// A group of large radio cards ("Who are you?", "Type of work") with a visible legend and an error.

import type { ComponentType } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export function ChoiceCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: readonly { value: T; label: string; hint: string; icon: IconType }[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-semibold text-leaf-950">{legend}</legend>
      <div className={cn("grid gap-2", options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {options.map(({ value: v, label, hint, icon: Icon }) => (
          <label
            key={v}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf-600",
              value === v ? "border-leaf-700 bg-leaf-50 text-leaf-900" : "border-white/60 bg-white/45 text-leaf-950/80 hover:bg-white/70",
            )}
          >
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            <Icon className="size-5 text-leaf-700" aria-hidden />
            <span className="text-ui font-semibold">{label}</span>
            <span className="text-xs leading-snug text-leaf-950/70">{hint}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </fieldset>
  );
}
