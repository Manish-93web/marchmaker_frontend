import { cn } from '../lib/cn';

/**
 * A calm full-page wait state: the Marchmaker mark inside a turning ring, on a soft warm glow. It announces itself to
 * screen readers, and the motion stops for people who ask their system for less of it.
 */
export function LoadingScreen({
  label = 'Loading',
  hint,
  fullScreen = true,
  className,
}: {
  label?: string;
  hint?: string;
  /** Fills the window. Turn off to sit inside a page area instead. */
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('relative grid place-items-center overflow-hidden px-6', fullScreen ? 'min-h-dvh' : 'min-h-[60vh]', className)}
      style={{
        backgroundImage:
          'radial-gradient(42% 36% at 80% 10%, rgb(242 163 58 / 0.16), transparent), radial-gradient(46% 40% at 10% 92%, rgb(226 114 91 / 0.14), transparent)',
      }}
    >
      <div className="flex flex-col items-center gap-7 text-center">
        <div className="relative h-28 w-28">
          {/* the track, then the arc that turns around it */}
          <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full text-border" aria-hidden="true" focusable="false">
            <circle cx="56" cy="56" r="50" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          <svg viewBox="0 0 112 112" className="absolute inset-0 h-full w-full motion-safe:animate-spin" style={{ animationDuration: '1.4s' }} aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="mm-load-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F2A33A" />
                <stop offset="1" stopColor="#E2725B" />
              </linearGradient>
            </defs>
            <circle cx="56" cy="56" r="50" fill="none" stroke="url(#mm-load-ring)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="78 236" />
          </svg>
          <svg viewBox="0 0 64 64" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-pulse" style={{ animationDuration: '2.2s' }} aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="mm-load-m" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#F2A33A" />
                <stop offset="1" stopColor="#E2725B" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="#4A1D3F" />
            <path d="M18 44V22l14 14 14-14v22" fill="none" stroke="url(#mm-load-m)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="font-display text-xl text-primary">
            {label}
            <span aria-hidden="true" className="ml-0.5 inline-flex gap-0.5 align-baseline">
              {[0, 1, 2].map((i) => (
                <span key={i} className="inline-block motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}>
                  .
                </span>
              ))}
            </span>
          </p>
          {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
