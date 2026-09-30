// ─────────────────────────────────────────────────────────────
// Scene part · Tower
// Building of the skyline; near buildings (tone 1) get lit windows.
// Used by: features/home/scene/HeroScene.tsx
// ─────────────────────────────────────────────────────────────

import { GROUND, type Building } from "../skyline";

export function Tower({ b }: { b: Building }) {
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
