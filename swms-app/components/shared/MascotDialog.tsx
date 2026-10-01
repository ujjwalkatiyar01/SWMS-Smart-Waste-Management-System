"use client";

// Every pop-up in the app (user rule 2026-09-30): the bin mascot holding a short sign about what just
// happened, a heading, a sentence and the next steps as buttons or links.

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { MascotFigure } from "./MascotFigure";

export function MascotDialog({
  open,
  onOpenChange,
  sign,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 1–3 short lines for the mascot's sign, e.g. ["REPORT", "SENT!"]. */
  sign: readonly string[];
  title: string;
  description: string;
  /** Next-step buttons or links. */
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-[1.75rem] bg-cream p-6 text-center shadow-card sm:max-w-md">
        <div className="mx-auto w-36 animate-bob sm:w-40">
          <MascotFigure sign={sign} />
        </div>
        <DialogTitle className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-leaf-950">{title}</DialogTitle>
        <DialogDescription className="mt-2 text-ui text-leaf-950/80">{description}</DialogDescription>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
