"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Two-sided media box. Shows the back (icon) face; hover or keyboard focus on
 * the parent `.group` flips to the front (photo). On touch screens the first
 * tap flips to the photo and the next tap follows the link.
 * Motion is instant under prefers-reduced-motion.
 */
export function FlipMedia({
  front,
  back,
  className,
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const onClick = (e: MouseEvent) => {
    if (open || !window.matchMedia("(hover: none)").matches) return;
    e.preventDefault();
    setOpen(true);
  };

  const face = "absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]";

  return (
    <span onClick={onClick} className={cn("relative block aspect-[4/3] [perspective:1100px]", className)}>
      <span
        className={cn(
          "absolute inset-0 block transition-transform duration-[900ms] ease-[var(--ease-spring)] [transform-style:preserve-3d]",
          open
            ? "[transform:rotateY(0deg)]"
            : "[transform:rotateY(180deg)] group-hover:[transform:rotateY(0deg)] group-focus-visible:[transform:rotateY(0deg)]",
        )}
      >
        <span className={face}>{front}</span>
        <span className={face} style={{ transform: "rotateY(180deg)" }}>
          {back}
        </span>
      </span>
    </span>
  );
}
