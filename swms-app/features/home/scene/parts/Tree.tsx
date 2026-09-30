export function Tree({ x, y, s = 1, shade = 0 }: { x: number; y: number; s?: number; shade?: number }) {
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
