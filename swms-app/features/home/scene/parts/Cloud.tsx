// ─────────────────────────────────────────────────────────────
// Scene part · Cloud
// White cloud; drift animation is set by the parent <g>.
// Used by: features/home/scene/HeroScene.tsx
// ─────────────────────────────────────────────────────────────

export function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
      <ellipse cx={0} cy={0} rx={70} ry={26} />
      <circle cx={-28} cy={-16} r={28} />
      <circle cx={16} cy={-26} r={36} />
      <circle cx={50} cy={-8} r={24} />
    </g>
  );
}
