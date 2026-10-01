"use client";

// Loading and error screens for the staff routes (loading.tsx / error.tsx only render these).

import { Button } from "@/components/ui/button";

export function RouteLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="sr-only">{label}</p>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function RouteError({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-leaf-950">This page could not load</h1>
      <p className="mt-2 text-muted-foreground">Check your connection and try again.</p>
      <Button className="mt-6 h-11 px-5" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
