import type { HTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-border bg-surface p-6 shadow-sm', className)} {...props} />;
}

const badge = cva('inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-ink',
      verified: 'bg-secondary text-secondary-fg',
      accent: 'bg-accent text-accent-fg',
      danger: 'bg-danger text-danger-fg',
    },
  },
  defaultVariants: { tone: 'neutral' },
});
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}
export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

export function Chip({
  selected,
  children,
  ...props
}: { selected?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'min-h-[40px] rounded-pill border px-4 text-sm transition-colors',
        selected ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-ink hover:bg-surface-2',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('rounded-card bg-surface-2', className)}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, var(--mm-border), transparent)',
        backgroundSize: '200% 100%',
        animation: 'mm-shimmer 1.4s linear infinite',
      }}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-hero border border-dashed border-border p-10 text-center">
      {icon ?? <EmptyArt />}
      <h3 className="font-display text-xl text-ink">{title}</h3>
      {description && <p className="max-w-md text-muted">{description}</p>}
      {action}
    </div>
  );
}

export function ProgressRing({ value, size = 56, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? 'Progress'}
      className="relative inline-flex"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mm-border)" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--mm-accent)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 250ms ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-ink">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  children: ReactNode;
}) {
  const tones = {
    info: 'border-info',
    warning: 'border-warning',
    danger: 'border-danger',
    success: 'border-success',
  } as const;
  return (
    <div role="status" className={cn('rounded-card border-l-4 bg-surface-2 px-4 py-3 text-sm text-ink', tones[tone])}>
      {children}
    </div>
  );
}

/** A quiet line drawing of an open envelope with a petal: the default picture for "nothing here yet". Decorative. */
function EmptyArt() {
  return (
    <svg viewBox="0 0 120 90" width="120" height="90" role="presentation" aria-hidden="true" focusable="false" className="text-primary">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 38l42-26 42 26v38a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" />
        <path d="M18 38l42 28 42-28" />
      </g>
      <ellipse cx="60" cy="34" rx="7" ry="12" fill="var(--color-accent, #F2A33A)" opacity="0.9" transform="rotate(-20 60 34)" />
    </svg>
  );
}
