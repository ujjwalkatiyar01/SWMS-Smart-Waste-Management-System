// Decorative floating island with a small clean city: towers, trees, wind turbine, pond and sorted bins.

const TOWERS = [
  { x: 150, w: 44, h: 118 },
  { x: 198, w: 52, h: 168 },
  { x: 254, w: 40, h: 104 },
  { x: 298, w: 50, h: 146 },
];

const TREES = [
  { x: 108, y: 252, r: 26, c: "#5a9a3a" },
  { x: 140, y: 266, r: 18, c: "#74ad4c" },
  { x: 356, y: 246, r: 22, c: "#4f9234" },
  { x: 470, y: 256, r: 20, c: "#74ad4c" },
  { x: 196, y: 276, r: 14, c: "#9fc97b" },
];

const BINS = [
  { x: 236, c: "#3b7a27" },
  { x: 262, c: "#2f7fc1" },
  { x: 288, c: "#c62828" },
];

const TOWER_BASE = 244;

export function CleanCityIsland({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 480" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="isl-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a6d672" />
          <stop offset="1" stopColor="#5f9f3c" />
        </linearGradient>
        <linearGradient id="isl-rock" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#e7d3a6" />
          <stop offset="0.45" stopColor="#bf9a66" />
          <stop offset="1" stopColor="#6f5234" />
        </linearGradient>
        <linearGradient id="isl-tower" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d6e7f4" />
          <stop offset="1" stopColor="#86a9c7" />
        </linearGradient>
        <linearGradient id="isl-pond" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8cc8ea" />
          <stop offset="1" stopColor="#4f97c7" />
        </linearGradient>
        <radialGradient id="isl-shadow">
          <stop offset="0" stopColor="#163419" stopOpacity="0.28" />
          <stop offset="1" stopColor="#163419" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={280} cy={462} rx={170} ry={14} fill="url(#isl-shadow)" />

      <g className="animate-float [transform-box:fill-box] origin-center">
        {/* Rock underside with strata and hanging roots */}
        <path d="M58 262 C 66 340, 170 426, 284 450 C 398 428, 494 340, 502 262 Z" fill="url(#isl-rock)" />
        <path d="M92 300 C 180 330, 380 330, 470 300" fill="none" stroke="#f3e6c6" strokeOpacity={0.5} strokeWidth={3} />
        <path d="M140 356 C 220 380, 350 380, 424 352" fill="none" stroke="#f3e6c6" strokeOpacity={0.35} strokeWidth={3} />
        <path d="M150 300 q -6 30 4 56 M330 330 q 8 34 -2 62 M410 300 q 6 22 -4 40" fill="none" stroke="#5b4128" strokeWidth={2} strokeLinecap="round" opacity={0.5} />

        {/* Grass top */}
        <ellipse cx={280} cy={262} rx={224} ry={48} fill="#4f8f32" />
        <ellipse cx={280} cy={254} rx={222} ry={44} fill="url(#isl-grass)" />
        <path d="M96 268 C 200 292, 360 292, 470 266" fill="none" stroke="#f8faf3" strokeOpacity={0.7} strokeWidth={10} strokeLinecap="round" />

        {/* Towers */}
        {TOWERS.map((t) => (
          <g key={t.x}>
            <rect x={t.x} y={TOWER_BASE - t.h} width={t.w} height={t.h} rx={6} fill="url(#isl-tower)" />
            {Array.from({ length: Math.floor((t.h - 20) / 18) }).map((_, row) => (
              <g key={row} fill="#ffffff" opacity={0.7}>
                <rect x={t.x + 8} y={TOWER_BASE - t.h + 14 + row * 18} width={t.w / 2 - 12} height={7} rx={2} />
                <rect x={t.x + t.w / 2 + 4} y={TOWER_BASE - t.h + 14 + row * 18} width={t.w / 2 - 12} height={7} rx={2} />
              </g>
            ))}
          </g>
        ))}
        {/* Rooftop solar panels and a green roof */}
        <path d="M202 72 l 18 -8 h 26 l -18 8 Z" fill="#2b4f7a" />
        <path d="M300 94 l 16 -8 h 30 l -16 8 Z" fill="#2b4f7a" />
        <ellipse cx={170} cy={126} rx={20} ry={6} fill="#74ad4c" />

        {/* Wind turbine */}
        <line x1={430} y1={258} x2={430} y2={112} stroke="#f8faf3" strokeWidth={5} strokeLinecap="round" />
        <g className="animate-turn" style={{ transformOrigin: "430px 112px" }}>
          {[0, 120, 240].map((a) => (
            <path key={a} d="M430 112 C 424 90, 426 64, 430 50 C 436 64, 436 90, 430 112 Z" fill="#ffffff" transform={`rotate(${a} 430 112)`} />
          ))}
        </g>
        <circle cx={430} cy={112} r={5} fill="#dde7ef" />

        {/* Pond */}
        <ellipse cx={392} cy={272} rx={54} ry={12} fill="url(#isl-pond)" />
        <path d="M364 270 h 24 M396 275 h 18" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" opacity={0.75} />

        {/* Trees sway gently */}
        {TREES.map((t, i) => (
          <g key={i} className="animate-sway [transform-box:fill-box] origin-bottom" style={{ animationDelay: `${i * -0.8}s` }}>
            <rect x={t.x - 2.5} y={t.y - 6} width={5} height={t.r + 8} rx={2} fill="#6f5234" />
            <circle cx={t.x} cy={t.y - t.r} r={t.r} fill={t.c} />
            <circle cx={t.x - t.r / 3} cy={t.y - t.r * 1.3} r={t.r / 3} fill="#ffffff" opacity={0.18} />
          </g>
        ))}

        {/* Sorted bins: wet, dry, hazardous */}
        {BINS.map((b) => (
          <g key={b.x}>
            <rect x={b.x} y={262} width={20} height={26} rx={4} fill={b.c} />
            <rect x={b.x - 2} y={257} width={24} height={7} rx={3} fill={b.c} />
            <rect x={b.x + 6} y={270} width={8} height={2.5} rx={1} fill="#ffffff" opacity={0.8} />
          </g>
        ))}
      </g>

      {/* Two small rocks float beside the island */}
      <g className="animate-float" style={{ animationDelay: "-2.5s" }}>
        <path d="M24 196 c 10 -8 34 -8 44 0 c -4 18 -18 28 -22 28 c -6 0 -18 -12 -22 -28 Z" fill="url(#isl-rock)" />
        <ellipse cx={46} cy={196} rx={22} ry={6} fill="url(#isl-grass)" />
      </g>
      <g className="animate-float" style={{ animationDelay: "-4.5s" }}>
        <path d="M506 150 c 8 -6 26 -6 34 0 c -3 14 -14 22 -17 22 c -5 0 -14 -9 -17 -22 Z" fill="url(#isl-rock)" />
        <ellipse cx={523} cy={150} rx={17} ry={5} fill="url(#isl-grass)" />
      </g>
    </svg>
  );
}
