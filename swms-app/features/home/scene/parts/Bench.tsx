export function Bench({ x, flip = false }: { x: number; flip?: boolean }) {
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
