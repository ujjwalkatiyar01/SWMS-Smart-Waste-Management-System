import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "./useLanguage";

const OPTIONS: { value: Lang; label: string; lang: string }[] = [
  { value: "en", label: "English", lang: "en" },
  { value: "hi", label: "हिन्दी", lang: "hi" },
];

export function LanguageToggle({ value, onChange, label }: { value: Lang; onChange: (lang: Lang) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-fit items-center gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-leaf-200">
      <Languages className="mx-2 size-4 text-leaf-700" aria-hidden />
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.lang}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-11 cursor-pointer rounded-full px-5 text-ui font-semibold transition-colors duration-200",
            value === option.value ? "bg-leaf-700 text-white" : "text-leaf-900 hover:bg-leaf-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
