/**
 * Decorative park + skyline backdrop for the home hero (inline SVG, no image
 * request). Mirrors the city-and-park scene inside the SWMS logo.
 */

type Building = { x: number; w: number; h: number; tone: number; spire?: boolean };

// Deterministic layouts (no randomness → identical on server and client).
const FAR: Building[] = [
  [20, 60, 170], [90, 46, 230], [150, 70, 150], [235, 52, 260], [300, 64, 190],
  [380, 44, 300, 1], [440, 70, 170], [525, 50, 220], [590, 62, 160], [665, 48, 250],
  [725, 66, 180], [805, 52, 290, 1], [870, 70, 160], [955, 46, 230], [1015, 64, 200],
  [1095, 50, 270], [1160, 72, 170], [1245, 48, 240, 1], [1305, 66, 190], [1385, 60, 220],
].map(([x, w, h, spire]) => ({ x, w, h, tone: 0, spire: Boolean(spire) }));

const NEAR: Building[] = [
  [40, 74, 210], [128, 58, 150], [196, 80, 260], [290, 60, 180], [365, 70, 130],
  [980, 66, 140], [1060, 84, 250], [1158, 60, 170], [1232, 78, 230], [1324, 64, 160],
].map(([x, w, h]) => ({ x, w, h, tone: 1 }));

const GROUND = 470;

function Tower({ b }: { b: Building }) {
  const y = GROUND - b.h;
  const fill = b.tone ? "url(#tower-near)" : "url(#tower-far)";
  const rows = Math.floor((b.h - 24) / 18);
  const cols = Math.max(2, Math.floor((b.w - 12) / 14));
  const gap = (b.w - 12) / cols;
  return (
    <g>
      <rect x={b.x} y={y} width={b.w} height={b.h} fill={fill} />
      {b.spire && <rect x={b.x + b.w / 2 - 1.5} y={y - 34} width={3} height={34} fill="#9fb6cc" />}
      {b.tone === 1 &&
        Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => (
            <rect
              key={`${r}-${c}`}
              x={b.x + 8 + c * gap}
              y={y + 14 + r * 18}
              width={gap - 5}
              height={9}
              rx={1}
              fill="#e8f0f7"
              opacity={(r + c) % 5 === 0 ? 0.95 : 0.55}
            />
          )),
        )}
    </g>
  );
}

function Tree({ x, y, s = 1, shade = 0 }: { x: number; y: number; s?: number; shade?: number }) {
  const tones = [
    ["#3f7f2c", "#5a9b3a", "#7cb652"],
    ["#356f25", "#4c8c31", "#6aa844"],
  ][shade];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-5} y={-10} width={10} height={46} rx={3} fill="#6b4f32" />
      <circle cx={-26} cy={-26} r={30} fill={tones[0]} />
      <circle cx={24} cy={-30} r={32} fill={tones[0]} />
      <circle cx={0} cy={-56} r={38} fill={tones[1]} />
      <circle cx={-10} cy={-66} r={20} fill={tones[2]} opacity={0.7} />
      <circle cx={18} cy={-44} r={16} fill={tones[2]} opacity={0.5} />
    </g>
  );
}

function Bench({ x, flip = false }: { x: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} 505) scale(${flip ? -1 : 1} 1)`}>
      <rect x={0} y={0} width={86} height={7} rx={2} fill="#9a6b3f" />
      <rect x={0} y={-16} width={86} height={6} rx={2} fill="#a8774a" />
      <rect x={0} y={-8} width={86} height={5} rx={2} fill="#a8774a" />
      <rect x={6} y={-18} width={4} height={40} fill="#2f3a2f" />
      <rect x={76} y={-18} width={4} height={40} fill="#2f3a2f" />
    </g>
  );
}

function Lamp({ x, y = 520, s = 1 }: { x: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-2.5} y={-150} width={5} height={150} fill="#263126" />
      <rect x={-7} y={-6} width={14} height={8} rx={2} fill="#263126" />
      <path d="M-11 -150 L11 -150 L7 -172 L-7 -172 Z" fill="#f8f1d2" stroke="#263126" strokeWidth={3} />
      <path d="M-13 -172 L13 -172 L0 -184 Z" fill="#263126" />
    </g>
  );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
      <ellipse cx={0} cy={0} rx={70} ry={26} />
      <circle cx={-28} cy={-16} r={28} />
      <circle cx={16} cy={-26} r={36} />
      <circle cx={50} cy={-8} r={24} />
    </g>
  );
}

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
