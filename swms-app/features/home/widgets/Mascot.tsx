"use client";

// Bin mascot: eyes follow the pointer; a tap shows the next tip.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MascotFigure } from "@/components/shared/MascotFigure";
import { TIPS } from "../content/mascot-tips";

const SIGN = ["KEEP OUR", "CITY", "CLEAN"];

// Leaf-burst directions (dx, dy, rotation) used by the tap animation.
const LEAVES = [
  { dx: "-90px", dy: "-70px", r: "-120deg" },
  { dx: "-50px", dy: "-120px", r: "80deg" },
  { dx: "10px", dy: "-140px", r: "-40deg" },
  { dx: "70px", dy: "-110px", r: "140deg" },
  { dx: "100px", dy: "-50px", r: "-90deg" },
  { dx: "-110px", dy: "-10px", r: "60deg" },
];

export function Mascot({ className }: { className?: string }) {
  const [tip, setTip] = useState(-1);
  const [tapKey, setTapKey] = useState(0);
  const [wink, setWink] = useState(false);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const winkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Pupils follow the pointer or finger.
  useEffect(() => {
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const r = svg.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height * 0.45);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 300);
        setEye({ x: (dx / d) * 4 * k, y: (dy / d) * 5 * k });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, []);

  useEffect(() => () => clearTimeout(winkTimer.current), []);

  const onTap = () => {
    setTip((t) => (t + 1) % TIPS.length);
    setTapKey((k) => k + 1);
    setWink(true);
    clearTimeout(winkTimer.current);
    winkTimer.current = setTimeout(() => setWink(false), 700);
    navigator.vibrate?.(12);
  };

  const tapped = tapKey > 0;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Speech bubble */}
      <div className="pointer-events-none relative z-10 mb-2 flex min-h-[64px] w-[min(88vw,300px)] items-end justify-center">
        <p
          key={tip}
          aria-live="polite"
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-center text-sm font-semibold shadow-float animate-pop",
            tapped ? "bg-white text-leaf-950" : "bg-leaf-900 text-white",
          )}
        >
          {tapped ? TIPS[tip] : "Tap me for a tip!"}
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45",
              tapped ? "bg-white" : "bg-leaf-900",
            )}
          />
        </p>
      </div>

      <button
        type="button"
        onClick={onTap}
        aria-label="SWMS bin mascot. Tap for the next tip."
        className="group relative block w-[210px] rounded-[40px] outline-offset-8 sm:w-[260px] lg:w-[330px]"
      >
        {/* Leaf burst on tap */}
        {tapped && (
          <span key={`burst-${tapKey}`} aria-hidden className="pointer-events-none absolute left-1/2 top-[18%] z-10">
            {LEAVES.map((l, i) => (
              <svg
                key={i}
                viewBox="0 0 20 20"
                className="absolute size-5 animate-burst"
                style={{ ["--dx" as string]: l.dx, ["--dy" as string]: l.dy, ["--r" as string]: l.r, animationDelay: `${i * 25}ms` }}
              >
                <path d="M2 18 C2 8 8 2 18 2 C18 12 12 18 2 18 Z" fill={i % 2 ? "#74ad4c" : "#9fc97b"} />
              </svg>
            ))}
          </span>
        )}

        {/* Ground shadow */}
        <span
          aria-hidden
          className="absolute bottom-[1%] left-1/2 h-[5%] w-[62%] -translate-x-1/2 rounded-[50%] bg-leaf-950/25 blur-[3px]"
        />

        <span key={`hop-${tapKey}`} className={cn("block origin-bottom", tapped && "animate-hop")}>
          <span className="block animate-bob transition-transform duration-200 group-active:scale-[0.97]">
            <MascotFigure sign={SIGN} eye={eye} wink={wink} tapKey={tapKey} svgRef={svgRef} />
          </span>
        </span>
      </button>
    </div>
  );
}
