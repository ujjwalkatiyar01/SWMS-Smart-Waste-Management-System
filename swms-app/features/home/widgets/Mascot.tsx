"use client";

// Bin mascot: eyes follow the pointer; a tap shows the next tip.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TIPS } from "../content/mascot-tips";

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
            <svg ref={svgRef} viewBox="0 0 320 420" className="h-auto w-full overflow-visible" aria-hidden>
              <defs>
                <linearGradient id="bin-body" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#4a8c31" />
                  <stop offset="0.45" stopColor="#6aac45" />
                  <stop offset="1" stopColor="#3f7f2c" />
                </linearGradient>
                <linearGradient id="bin-lid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#6aac45" />
                  <stop offset="1" stopColor="#447f2e" />
                </linearGradient>
              </defs>

              {/* Legs and shoes */}
              <rect x={118} y={348} width={26} height={40} rx={10} fill="#3b7a27" />
              <rect x={176} y={348} width={26} height={40} rx={10} fill="#3b7a27" />
              <ellipse cx={126} cy={392} rx={28} ry={13} fill="#2e6420" />
              <ellipse cx={194} cy={392} rx={28} ry={13} fill="#2e6420" />

              {/* Body */}
              <path
                d="M78 140 L242 140 Q249 140 248 148 L232 350 Q231 362 218 362 L102 362 Q89 362 88 350 L72 148 Q71 140 78 140 Z"
                fill="url(#bin-body)"
              />
              <path d="M112 160 L118 345 M208 160 L202 345" stroke="#ffffff" strokeOpacity={0.12} strokeWidth={6} strokeLinecap="round" />

              {/* Holding arm (right side) */}
              <path d="M240 226 C 262 250, 260 290, 244 314" fill="none" stroke="#4f9234" strokeWidth={22} strokeLinecap="round" />

              {/* Sign */}
              <g transform="rotate(-4 168 294)">
                <rect x={100} y={240} width={138} height={110} rx={12} fill="#f5eedb" stroke="#d8cba6" strokeWidth={2} />
                <g fill="#2e6420" fontFamily="var(--font-sans), system-ui, sans-serif" fontWeight={800} textAnchor="middle" fontSize={21} letterSpacing={0.5}>
                  <text x={169} y={270}>KEEP OUR</text>
                  <text x={169} y={295}>CITY</text>
                  <text x={169} y={320}>CLEAN</text>
                </g>
                <path d="M169 344 l-8 -8 a5 5 0 0 1 8 -6 a5 5 0 0 1 8 6 Z" fill="#2e6420" />
              </g>
              <circle cx={244} cy={316} r={15} fill="#5a9b3a" />
              <circle cx={104} cy={300} r={15} fill="#5a9b3a" />

              {/* Lid + handle */}
              <rect x={130} y={94} width={60} height={22} rx={9} fill="#3b7a27" />
              <rect x={141} y={101} width={38} height={6} rx={3} fill="#2a5a1d" />
              <rect x={58} y={108} width={204} height={42} rx={18} fill="url(#bin-lid)" />
              <rect x={64} y={140} width={192} height={10} rx={5} fill="#2e6420" opacity={0.45} />

              {/* Sprout */}
              <g className="animate-sway origin-bottom [transform-box:fill-box]">
                <path d="M160 98 C 160 84, 157 72, 160 58" fill="none" stroke="#4f9234" strokeWidth={6} strokeLinecap="round" />
                <path d="M158 66 C 132 40, 104 42, 94 54 C 108 74, 136 78, 158 66 Z" fill="#7cb652" />
                <path d="M156 65 C 136 56, 118 54, 104 55" fill="none" stroke="#4f9234" strokeWidth={2} strokeLinecap="round" />
                <path d="M162 60 C 184 28, 216 28, 230 38 C 218 62, 190 72, 162 60 Z" fill="#5fa23f" />
                <path d="M165 59 C 184 48, 202 42, 220 40" fill="none" stroke="#3b7a27" strokeWidth={2} strokeLinecap="round" />
              </g>

              {/* Thumbs-up arm (left side) — waves on tap */}
              <g key={`arm-${tapKey}`} className={cn("origin-[84px_206px]", tapped && "animate-wave")}>
                <path d="M84 208 C 56 208, 42 192, 44 168" fill="none" stroke="#4f9234" strokeWidth={22} strokeLinecap="round" />
                <rect x={27} y={140} width={36} height={32} rx={13} fill="#5a9b3a" />
                <rect x={35} y={114} width={15} height={32} rx={7.5} fill="#6aac45" />
              </g>

              {/* Face */}
              <path d="M118 166 Q132 156 146 164" fill="none" stroke="#1d2b1d" strokeWidth={4} strokeLinecap="round" />
              <path d="M176 164 Q190 156 204 166" fill="none" stroke="#1d2b1d" strokeWidth={4} strokeLinecap="round" />

              <g className="animate-blink origin-center [transform-box:fill-box]">
                <ellipse cx={132} cy={190} rx={12} ry={16} fill="#152015" />
                <circle cx={128 + eye.x} cy={184 + eye.y} r={4.5} fill="#ffffff" />
              </g>
              {wink ? (
                <path d="M176 192 Q190 180 204 192" fill="none" stroke="#152015" strokeWidth={5} strokeLinecap="round" />
              ) : (
                <g className="animate-blink origin-center [transform-box:fill-box]">
                  <ellipse cx={190} cy={190} rx={12} ry={16} fill="#152015" />
                  <circle cx={186 + eye.x} cy={184 + eye.y} r={4.5} fill="#ffffff" />
                </g>
              )}

              <ellipse cx={112} cy={216} rx={12} ry={7} fill="#f28b82" opacity={0.45} />
              <ellipse cx={210} cy={216} rx={12} ry={7} fill="#f28b82" opacity={0.45} />
              <path d={wink ? "M138 212 Q161 246 184 212 Z" : "M142 214 Q161 238 180 214 Z"} fill="#3a1414" />
              <ellipse cx={161} cy={wink ? 230 : 225} rx={9} ry={4.5} fill="#e5736b" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}
