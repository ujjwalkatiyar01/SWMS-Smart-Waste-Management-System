// ─────────────────────────────────────────────────────────────
// Scene part · Lamp
// Street lamp.
// Used by: features/home/scene/HeroScene.tsx
// ─────────────────────────────────────────────────────────────

export function Lamp({ x, y = 520, s = 1 }: { x: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-2.5} y={-150} width={5} height={150} fill="#263126" />
      <rect x={-7} y={-6} width={14} height={8} rx={2} fill="#263126" />
      <path d="M-11 -150 L11 -150 L7 -172 L-7 -172 Z" fill="#f8f1d2" stroke="#263126" strokeWidth={3} />
      <path d="M-13 -172 L13 -172 L0 -184 Z" fill="#263126" />
    </g>
  );
}
