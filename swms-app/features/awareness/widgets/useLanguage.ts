// Awareness page language, remembered on this device (03-FULL-APP-FLOW F10.2).

import { useSyncExternalStore } from "react";

export type Lang = "en" | "hi";

const KEY = "swms-awareness-lang";
const listeners = new Set<() => void>();
let fallback: Lang = "en"; // used when browser storage is blocked (private mode)

function read(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === "hi" ? "hi" : "en";
  } catch {}
  return fallback;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useLanguage() {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as const);

  function setLang(next: Lang) {
    fallback = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((notify) => notify());
  }

  return [lang, setLang] as const;
}
