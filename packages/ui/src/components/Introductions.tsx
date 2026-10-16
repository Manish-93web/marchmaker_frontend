import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Badge, Card } from './Display';

// ------------------------------------------------------------------ RangeSlider

/** Two native range inputs layered: keyboard, touch and screen readers work as they do for any range input. */
export function RangeSlider({
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  unit = '',
}: {
  label: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  step?: number;
  unit?: string;
}) {
  const [lo, hi] = value;
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const thumb = 'pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto';
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        {label}: {lo}
        {unit} to {hi}
        {unit}
      </legend>
      <div className="relative h-11">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-2" />
        <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input type="range" aria-label={`${label}, lowest`} className={thumb} min={min} max={max} step={step} value={lo} onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])} />
        <input type="range" aria-label={`${label}, highest`} className={thumb} min={min} max={max} step={step} value={hi} onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])} />
      </div>
    </fieldset>
  );
}

// ------------------------------------------------------------------ Stepper

export interface StepperStep {
  id: string;
  label: string;
}

/** Progress through a wizard. The current step is announced, and finished steps say so in words as well as colour. */
export function Stepper({ steps, current, label }: { steps: StepperStep[]; current: string; label: string }) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <ol aria-label={label} className="flex flex-wrap gap-2">
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'current' : 'upcoming';
        return (
          <li key={s.id} aria-current={state === 'current' ? 'step' : undefined} className={cn('flex min-h-[36px] items-center gap-2 rounded-pill border px-3 text-sm', state === 'current' && 'border-primary bg-primary text-primary-fg', state === 'done' && 'border-secondary text-secondary', state === 'upcoming' && 'border-border text-muted')}>
            <span aria-hidden="true">{state === 'done' ? '✓' : i + 1}</span>
            <span>{s.label}</span>
            {state === 'done' && <span className="sr-only">(done)</span>}
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------ BlurredPhoto

/** A photo that stays soft until it is allowed to be seen sharp. Right-click and dragging are off; the watermark names the viewer. */
export function BlurredPhoto({ src, alt = '', revealed, watermark, className }: { src: string; alt?: string; revealed: boolean; watermark?: string; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-hero bg-surface-2', className)}>
      <img src={src} alt={alt} draggable={false} onContextMenu={(e) => e.preventDefault()} className={cn('h-full w-full object-cover transition-[filter] duration-700', revealed ? 'blur-0' : 'blur-xl scale-110')} />
      {revealed && watermark && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center -rotate-12 text-xs font-medium text-white/50">
          {watermark}
        </span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ IntroductionCard

export interface IntroductionCardProps {
  name: string;
  age: number;
  city?: string;
  profession?: string;
  why: string;
  highlights?: string[];
  badges?: string[];
  photo?: ReactNode;
  footer?: ReactNode;
  waitingOn?: string;
}

/** One introduction: who, why we chose them, what you may share. A single card, never a feed. */
export function IntroductionCard({ name, age, city, profession, why, highlights = [], badges = [], photo, footer, waitingOn }: IntroductionCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex gap-4">
        {photo && <div className="h-28 w-24 shrink-0">{photo}</div>}
        <div className="min-w-0">
          <h3 className="font-display text-2xl text-primary">
            {name}, {age}
          </h3>
          <p className="text-sm text-muted">{[city, profession].filter(Boolean).join(' · ')}</p>
          {badges.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {badges.map((b) => (
                <li key={b}>
                  <Badge tone="verified">{b}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <blockquote className="rounded-card border-l-4 border-accent bg-surface-2 p-4 font-display text-lg">{why}</blockquote>
      {highlights.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {highlights.map((h) => (
            <li key={h} className="rounded-pill bg-surface-2 px-3 py-1">
              {h}
            </li>
          ))}
        </ul>
      )}
      {waitingOn && <p className="text-sm text-muted">{waitingOn}</p>}
      {footer}
    </Card>
  );
}
