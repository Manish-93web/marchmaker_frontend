import { Bell, Pause, Play, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Badge, Card } from './Display';
import { Button } from './Button';

// ------------------------------------------------------------------ StatTile

/** One number with a plain label and an optional note, for dashboards. The label is read before the value. */
export function StatTile({ label, value, note, tone }: { label: string; value: ReactNode; note?: string; tone?: 'danger' | 'verified' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('font-display text-2xl', tone === 'danger' ? 'text-danger' : 'text-primary')}>{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ Timeline

export interface TimelineStep {
  id: string;
  title: string;
  detail?: string;
  state: 'done' | 'current' | 'upcoming';
}

/** A vertical journey: what is done, what is happening now, what comes next. State is text, not only colour. */
export function Timeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  const word = { done: 'Done', current: 'In progress', upcoming: 'Next' } as const;
  return (
    <ol aria-label={label} className="space-y-4">
      {steps.map((s) => (
        <li key={s.id} aria-current={s.state === 'current' ? 'step' : undefined} className="flex gap-3">
          <span
            aria-hidden="true"
            className={cn('mt-1 h-3 w-3 shrink-0 rounded-full border-2', s.state === 'done' && 'border-secondary bg-secondary', s.state === 'current' && 'border-accent bg-accent', s.state === 'upcoming' && 'border-border bg-surface')}
          />
          <div>
            <p className={cn('font-medium', s.state === 'upcoming' && 'text-muted')}>
              {s.title} <span className="sr-only">({word[s.state]})</span>
            </p>
            {s.detail && <p className="text-sm text-muted">{s.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ PricingCard

export interface PricingCardProps {
  name: string;
  tagline?: string;
  price: string;
  period?: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
  cta: ReactNode;
}

/** A plan with its price, what it includes and one clear action. Highlighting is a badge plus a border, never colour alone. */
export function PricingCard({ name, tagline, price, period, features, highlight, badge, cta }: PricingCardProps) {
  return (
    <Card className={cn('flex h-full flex-col', highlight && 'border-2 border-accent')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl">{name}</h3>
        {badge && <Badge tone="accent">{badge}</Badge>}
      </div>
      {tagline && <p className="mt-1 text-sm text-muted">{tagline}</p>}
      <p className="mt-4">
        <span className="font-display text-3xl text-primary">{price}</span>
        {period && <span className="ml-1 text-sm text-muted">{period}</span>}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden="true">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </Card>
  );
}

// ------------------------------------------------------------------ AudioPlayer

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Play/pause, a seekable position, speed and resume. The transcript should always sit beside it. */
export function AudioPlayer({
  src,
  title,
  startAt = 0,
  speed: initialSpeed = 1,
  onProgress,
  onSpeedChange,
  onEnded,
  labels = { play: 'Play', pause: 'Pause', position: 'Position', speed: 'Speed' },
}: {
  src: string;
  title: string;
  startAt?: number;
  speed?: number;
  onProgress?: (seconds: number) => void;
  onSpeedChange?: (speed: number) => void;
  onEnded?: () => void;
  labels?: { play: string; pause: string; position: string; speed: string };
}) {
  const el = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(startAt);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(initialSpeed);
  const last = useRef(0);

  useEffect(() => {
    if (el.current) {
      el.current.currentTime = startAt;
      el.current.playbackRate = initialSpeed;
    }
  }, [startAt, initialSpeed]);

  return (
    <div role="group" aria-label={title} className="space-y-2 rounded-card border border-border bg-surface p-3">
      <audio
        ref={el}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          if (onProgress && Math.abs(t - last.current) >= 15) {
            last.current = t;
            onProgress(Math.floor(t));
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          onProgress?.(Math.floor(el.current?.currentTime ?? 0));
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          aria-label={playing ? labels.pause : labels.play}
          onClick={() => {
            const a = el.current;
            if (!a) return;
            if (a.paused) void a.play().catch(() => undefined);
            else a.pause();
          }}
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        </Button>
        <input
          type="range"
          aria-label={labels.position}
          className="min-h-[44px] flex-1"
          min={0}
          max={Math.max(1, Math.floor(duration))}
          value={Math.floor(time)}
          aria-valuetext={`${clock(time)} of ${clock(duration)}`}
          onChange={(e) => {
            if (el.current) el.current.currentTime = Number(e.target.value);
          }}
        />
        <span className="w-24 text-right text-xs tabular-nums text-muted">
          {clock(time)} / {clock(duration)}
        </span>
        <label className="text-xs">
          <span className="sr-only">{labels.speed}</span>
          <select
            className="min-h-[44px] rounded-input border border-border bg-surface px-2"
            value={speed}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeed(v);
              if (el.current) el.current.playbackRate = v;
              onSpeedChange?.(v);
            }}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ NotificationBell

/** The bell with an unread count that is spoken, not just shown. */
export function NotificationBell({ count, label, onClick }: { count: number; label: (count: number) => string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label(count)} className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-pill hover:bg-surface-2">
      <Bell className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span aria-hidden="true" className="absolute right-1 top-1 min-w-[18px] rounded-pill bg-accent px-1 text-center text-[11px] font-semibold leading-[18px] text-accent-fg">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

// ------------------------------------------------------------------ CommandPalette

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

/** Ctrl/Cmd+K style launcher: type to filter, arrows to move, Enter to run, Escape to close. */
export function CommandPalette({ commands, open, onClose, label = 'Command palette', inputLabel = 'Command', placeholder = 'Type a command…', empty = 'No matches', extra }: { commands: PaletteCommand[]; open: boolean; onClose: () => void; label?: string; inputLabel?: string; placeholder?: string; empty?: string; extra?: (query: string) => PaletteCommand | null }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hits = commands.filter((c) => !needle || c.label.toLowerCase().includes(needle));
    const more = needle ? extra?.(q.trim()) : null;
    return more ? [...hits, more] : hits;
  }, [commands, q, extra]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);
  if (!open) return null;

  const choose = (c?: PaletteCommand) => {
    if (!c) return;
    onClose();
    c.run();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-black/40 p-4 pt-[15vh]" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="mx-auto w-full max-w-lg overflow-hidden rounded-hero border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, list.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          }
          if (e.key === 'Enter') choose(list[active]);
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted" aria-hidden />
          <input ref={input} role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={list[active] ? `cmd-${list[active]!.id}` : undefined} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={inputLabel} className="min-h-[48px] flex-1 bg-transparent outline-none" />
        </div>
        <ul id="palette-list" role="listbox" className="max-h-72 overflow-y-auto p-1">
          {list.map((c, i) => (
            <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => choose(c)} className={cn('flex min-h-[44px] cursor-pointer items-center justify-between rounded px-3 text-sm', i === active && 'bg-surface-2')}>
              <span>{c.label}</span>
              {c.hint && <span className="text-xs text-muted">{c.hint}</span>}
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-4 text-sm text-muted">{empty}</li>}
        </ul>
      </div>
    </div>
  );
}
