/**
 * Decorative artwork for the sign-in and sign-up side panel: a marigold-and-mandala motif with two interlocked
 * rings, the traditional symbol of a joining. Drawn in code so it needs no image file, stays sharp at any size
 * and costs almost nothing to load. It is purely decorative (hidden from screen readers).
 */
const AMBER = '#F2A33A';
const CORAL = '#E2725B';
const ROSE = '#F4C6D7';

/** `count` petals around a centre, each an ellipse pointing outwards. */
function Petals({ count, radius, rx, ry, fill, opacity }: { count: number; radius: number; rx: number; ry: number; fill: string; opacity: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <ellipse key={i} cx={0} cy={-radius} rx={rx} ry={ry} fill={fill} opacity={opacity} transform={`rotate(${(360 / count) * i})`} />
      ))}
    </g>
  );
}

function Heart({ x, y, size, opacity }: { x: number; y: number; size: number; opacity: number }) {
  return (
    <path
      d="M0 6 C-10 -2 -8 -12 0 -7 C8 -12 10 -2 0 6 Z"
      fill={ROSE}
      opacity={opacity}
      transform={`translate(${x} ${y}) scale(${size})`}
    />
  );
}

export function AuthArt() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="aa-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5A2350" />
          <stop offset="0.55" stopColor="#3B1632" />
          <stop offset="1" stopColor="#24101F" />
        </linearGradient>
        <radialGradient id="aa-glow" cx="0.5" cy="0.41" r="0.55">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.38" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aa-ring-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD58A" />
          <stop offset="1" stopColor={AMBER} />
        </linearGradient>
        <linearGradient id="aa-ring-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6A28F" />
          <stop offset="1" stopColor={CORAL} />
        </linearGradient>
      </defs>

      <rect width="600" height="800" fill="url(#aa-bg)" />
      <rect width="600" height="800" fill="url(#aa-glow)" />

      {/* mandala */}
      <g transform="translate(300 330)">
        <circle r="250" fill="none" stroke={AMBER} strokeOpacity="0.18" strokeDasharray="2 10" strokeWidth="2" />
        <circle r="214" fill="none" stroke={ROSE} strokeOpacity="0.12" strokeWidth="1" />
        <Petals count={24} radius={196} rx={9} ry={28} fill={AMBER} opacity={0.22} />
        <Petals count={16} radius={150} rx={15} ry={44} fill={CORAL} opacity={0.2} />
        <Petals count={12} radius={104} rx={18} ry={46} fill={ROSE} opacity={0.14} />
        <Petals count={8} radius={62} rx={14} ry={32} fill={AMBER} opacity={0.3} />
        <circle r="20" fill={AMBER} opacity="0.5" />
      </g>

      {/* two interlocked rings */}
      <g transform="translate(300 330)" fill="none" strokeWidth="13" strokeLinecap="round">
        <circle cx="-34" r="62" stroke="url(#aa-ring-a)" />
        <circle cx="34" r="62" stroke="url(#aa-ring-b)" />
      </g>

      {/* marigold garland along the bottom edge of the artwork */}
      <g transform="translate(0 560)">
        <path d="M-10 40 C150 120 450 120 610 40" fill="none" stroke={AMBER} strokeOpacity="0.45" strokeWidth="2" />
        {Array.from({ length: 13 }, (_, i) => {
          const t = i / 12;
          const x = -10 + t * 620;
          const y = 40 + 80 * 4 * t * (1 - t) * 0.95;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <Petals count={8} radius={7} rx={4} ry={8} fill={i % 2 ? AMBER : CORAL} opacity={0.75} />
              <circle r="3.5" fill="#FFE3A8" />
            </g>
          );
        })}
      </g>

      {/* a few floating hearts and sparks */}
      <Heart x={92} y={150} size={1.6} opacity={0.5} />
      <Heart x={505} y={118} size={1.1} opacity={0.45} />
      <Heart x={540} y={470} size={1.9} opacity={0.35} />
      <Heart x={70} y={440} size={1.2} opacity={0.4} />
      {[
        [150, 70],
        [455, 215],
        [60, 300],
        [545, 330],
        [215, 505],
        [395, 520],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 2.4 : 1.6} fill="#FFE3A8" opacity="0.7" />
      ))}
    </svg>
  );
}
