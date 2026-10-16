import { cn } from '../lib/cn';

export type Strength = 0 | 1 | 2 | 3 | 4;

/** Heuristic only: server rules (length, mixed case, digit) remain the source of truth. */
export function passwordStrength(pw: string): Strength {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as Strength;
}

const LABELS = ['', 'Too weak', 'Getting there', 'Good', 'Strong'] as const;
const TONES = ['', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'] as const;

export function PasswordStrength({ password }: { password: string }) {
  const s = passwordStrength(password);
  return (
    <div aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-pill bg-border', s >= i && TONES[s])} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {password ? `Password strength: ${LABELS[s]}` : 'Use at least 10 characters with upper case, lower case and a number'}
      </p>
    </div>
  );
}
