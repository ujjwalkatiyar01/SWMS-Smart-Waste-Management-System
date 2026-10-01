// Decorative green planet behind the login frame; only its top and bottom edges show. Turns very slowly.

const TREES = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * Math.PI * 2;
  const r = 2.4 + ((i * 7) % 5) * 0.45;
  return {
    cx: 50 + Math.cos(angle) * 48.6,
    cy: 50 + Math.sin(angle) * 48.6,
    r,
    fill: ["#4f9234", "#74ad4c", "#3b7a27", "#9fc97b"][i % 4],
  };
});

export function PlanetBackdrop({ className }: { className?: string }) {
  return (
    <svg viewBox="-6 -6 112 112" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id="planet-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8cc45a" />
          <stop offset="0.4" stopColor="#3b7a27" />
          <stop offset="0.8" stopColor="#163419" />
          <stop offset="1" stopColor="#0c1f0e" />
        </linearGradient>
      </defs>
      <g className="animate-orbit" style={{ transformOrigin: "50px 50px" }}>
        {TREES.map((t, i) => (
          <circle key={i} cx={t.cx} cy={t.cy} r={t.r} fill={t.fill} />
        ))}
      </g>
      <circle cx={50} cy={50} r={48} fill="url(#planet-body)" />
    </svg>
  );
}
