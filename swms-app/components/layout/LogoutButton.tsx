"use client";

import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-11 items-center gap-2 rounded-full px-3 text-ui font-semibold text-leaf-900 transition-colors hover:bg-leaf-100 disabled:cursor-wait disabled:opacity-70 sm:px-4"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
      {pending ? "Logging out…" : "Log out"}
    </button>
  );
}
