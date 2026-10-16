/**
 * Hand-drawn style SVG art for the marketing pages. All of it is decorative (aria-hidden) and uses the
 * theme colours through currentColor and CSS variables, so it follows light and dark themes.
 */

const P = 'var(--color-primary, #4A1D3F)';
const A = 'var(--color-accent, #F2A33A)';
const S = 'var(--color-secondary, #2F7D6B)';

/** Two interlocking rings with a few marigold petals: an introduction between two people. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" role="presentation" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id="ring-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={P} />
          <stop offset="1" stopColor={A} />
        </linearGradient>
        <linearGradient id="ring-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={S} />
          <stop offset="1" stopColor={A} />
        </linearGradient>
      </defs>
      <circle cx="140" cy="150" r="82" fill="none" stroke="url(#ring-a)" strokeWidth="14" />
      <circle cx="220" cy="150" r="82" fill="none" stroke="url(#ring-b)" strokeWidth="14" />
      <path d="M180 92 a82 82 0 0 1 0 116" fill="none" stroke={A} strokeWidth="14" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={300 + (i % 2) * 14} cy={40 + i * 26} rx="9" ry="16" fill={A} opacity={0.85 - i * 0.12} transform={`rotate(${-30 + i * 22} ${300 + (i % 2) * 14} ${40 + i * 26})`} />
      ))}
      <circle cx="60" cy="48" r="5" fill={S} />
      <circle cx="92" cy="30" r="3" fill={A} />
      <circle cx="48" cy="250" r="4" fill={P} opacity="0.5" />
    </svg>
  );
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** One drawing per step of "How it works". */
export function StepArt({ step, className }: { step: 0 | 1 | 2 | 3; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="presentation" aria-hidden="true" focusable="false" className={className}>
      {step === 0 && (
        <g {...stroke}>
          <rect x="14" y="10" width="36" height="44" rx="5" />
          <circle cx="32" cy="26" r="6" />
          <path d="M22 44c2-6 6-8 10-8s8 2 10 8" />
        </g>
      )}
      {step === 1 && (
        <g {...stroke}>
          <path d="M32 8l18 7v14c0 12-8 21-18 27C22 50 14 41 14 29V15z" />
          <path d="M24 31l6 6 11-12" />
        </g>
      )}
      {step === 2 && (
        <g {...stroke}>
          <circle cx="27" cy="27" r="13" />
          <path d="M37 37l13 13" />
          <path d="M21 27l4 4 7-8" />
        </g>
      )}
      {step === 3 && (
        <g {...stroke}>
          <path d="M32 52C16 41 10 32 10 24c0-7 5-12 11-12 5 0 9 3 11 7 2-4 6-7 11-7 6 0 11 5 11 12 0 8-6 17-22 28z" />
        </g>
      )}
    </svg>
  );
}

/** A quiet shield with a keyhole for the safety section. */
export function ShieldArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 220" role="presentation" aria-hidden="true" focusable="false" className={className}>
      <path d="M100 12l76 28v52c0 52-34 90-76 114C58 182 24 144 24 92V40z" fill={P} opacity="0.1" stroke={P} strokeWidth="6" strokeLinejoin="round" />
      <circle cx="100" cy="94" r="20" fill={A} />
      <rect x="90" y="104" width="20" height="44" rx="8" fill={A} />
      <circle cx="170" cy="30" r="6" fill={S} />
      <circle cx="30" cy="190" r="5" fill={A} opacity="0.7" />
    </svg>
  );
}
