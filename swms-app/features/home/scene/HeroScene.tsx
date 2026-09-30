// ─────────────────────────────────────────────────────────────
// Module · Home › Park scene (decorative backdrop of the hero)
// Assembles the SVG layers back to front: clouds → birds → skyline
// → tree line → ground and footpaths → trees, benches, lamps → grass.
// Used by: features/home/sections/Hero.tsx
// Uses:    skyline (data), parts/Tower, Tree, Bench, Lamp, Cloud
// ─────────────────────────────────────────────────────────────

/**
 * Decorative park + skyline backdrop for the home hero (inline SVG, no image
 * request). Mirrors the city-and-park scene inside the SWMS logo.
 */

import { Bench } from "./parts/Bench";
import { Cloud } from "./parts/Cloud";
import { Lamp } from "./parts/Lamp";
import { Tower } from "./parts/Tower";
import { Tree } from "./parts/Tree";
import { FAR, GROUND, NEAR } from "./skyline";

export function HeroScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="tower-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d9e8" />
          <stop offset="1" stopColor="#dde7ef" />
        </linearGradient>
        <linearGradient id="tower-near" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fb0cc" />
          <stop offset="1" stopColor="#6f93b3" />
        </linearGradient>
        <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc45a" />
          <stop offset="1" stopColor="#4f8f32" />
        </linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8faf3" stopOpacity="0" />
          <stop offset="1" stopColor="#f8faf3" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Clouds drift slowly */}
      <g opacity={0.9} className="animate-drift">
        <Cloud x={120} y={120} s={1.1} />
        <Cloud x={1320} y={90} s={1.25} />
      </g>
      <g opacity={0.7} className="animate-drift-slow">
        <Cloud x={330} y={250} s={0.7} />
        <Cloud x={1140} y={230} s={0.8} />
      </g>

      {/* Birds */}
      <g className="animate-fly" style={{ animationDelay: "-9s" }}>
        {[
          [0, 300, 1],
          [34, 318, 0.8],
          [18, 282, 0.7],
        ].map(([bx, by, bs], i) => (
          <g key={i} transform={`translate(${bx} ${by}) scale(${bs})`}>
            <path
              d="M0 0 Q8 -8 16 0 Q24 -8 32 0"
              fill="none"
              stroke="#5b6b5b"
              strokeWidth={2.5}
              strokeLinecap="round"
              className="animate-flap origin-center [transform-box:fill-box]"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          </g>
        ))}
      </g>

      {/* Skyline */}
      <g>{FAR.map((b, i) => <Tower key={`f${i}`} b={b} />)}</g>
      <rect x={0} y={300} width={1440} height={170} fill="url(#haze)" />
      <g>{NEAR.map((b, i) => <Tower key={`n${i}`} b={b} />)}</g>

      {/* Tree line */}
      {Array.from({ length: 30 }).map((_, i) => (
        <circle
          key={i}
          cx={i * 50 + (i % 2) * 18}
          cy={GROUND + (i % 3) * 4}
          r={26 + (i % 4) * 5}
          fill={i % 2 ? "#6fae47" : "#5c9d3b"}
        />
      ))}

      {/* Ground + footpath */}
      <path d="M0 480 C 360 458, 1080 458, 1440 480 L1440 600 L0 600 Z" fill="url(#grass)" />
      <path
        d="M640 600 C 660 560, 560 540, 380 530 C 250 523, 120 528, 0 540 L0 556 C 140 546, 280 546, 400 552 C 560 560, 610 578, 600 600 Z"
        fill="#ece4cf"
        opacity={0.9}
      />
      <path
        d="M800 600 C 790 570, 860 548, 1040 538 C 1180 530, 1320 534, 1440 544 L1440 558 C 1320 550, 1180 548, 1060 556 C 900 566, 836 580, 840 600 Z"
        fill="#ece4cf"
        opacity={0.9}
      />

      {/* Foreground trees, benches, lamps */}
      <Tree x={70} y={470} s={1.25} shade={1} />
      <Tree x={250} y={488} s={0.95} />
      <Tree x={1200} y={486} s={1} />
      <Tree x={1380} y={472} s={1.3} shade={1} />
      <Bench x={120} />
      <Bench x={1330} flip />
      <Lamp x={330} y={520} s={0.9} />
      <Lamp x={1110} y={520} s={0.9} />

      {/* Grass tufts */}
      {Array.from({ length: 24 }).map((_, i) => (
        <path
          key={i}
          d={`M${i * 62 + 10} 600 q4 -18 8 0 q4 -14 8 0`}
          fill="#3f7f2c"
          opacity={0.55}
        />
      ))}
    </svg>
  );
}
