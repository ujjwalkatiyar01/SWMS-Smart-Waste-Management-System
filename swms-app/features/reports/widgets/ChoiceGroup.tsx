"use client";

// One-choice question shown as large tappable options (radio buttons with a visible legend).

import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChoiceGroup<Value extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  optional = false,
  columns = 2,
}: {
  name: string;
  legend: string;
  options: { value: Value; label: string }[];
  value: Value | null;
  onChange: (value: Value) => void;
  error?: string;
  optional?: boolean;
  columns?: 2 | 3;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} aria-invalid={error ? true : undefined}>
      <legend className="text-sm font-semibold text-leaf-950">
        {legend}
        {optional && <span className="ml-1 font-normal text-leaf-950/70">(optional)</span>}
      </legend>
      <div className={cn("mt-2 grid grid-cols-1 gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-2 text-ui font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf-600",
              value === o.value ? "border-leaf-600 bg-leaf-50 text-leaf-950" : "border-leaf-900/15 bg-white text-leaf-950/85 hover:bg-leaf-50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="size-4 accent-leaf-700"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </fieldset>
  );
}
