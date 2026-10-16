import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '../lib/cn';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * One-time-code entry: auto-advance, backspace navigation, paste of a full code, and
 * SMS autofill (`autocomplete="one-time-code"` plus the WebOTP API where available).
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  label = 'Verification code',
  error,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? '');

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  useEffect(() => {
    if (!('OTPCredential' in window) || disabled) return;
    const ac = new AbortController();
    (navigator.credentials as CredentialsContainer & {
      get(o: { otp: { transport: string[] }; signal: AbortSignal }): Promise<{ code?: string } | null>;
    })
      .get({ otp: { transport: ['sms'] }, signal: ac.signal })
      .then((c) => c?.code && commit(c.code))
      .catch(() => undefined);
    return () => ac.abort();
  }, [disabled]);

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    commit(e.clipboardData.getData('text'));
    refs.current[Math.min(length - 1, e.clipboardData.getData('text').replace(/\D/g, '').length)]?.focus();
  };

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="flex gap-2">
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={c}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && i === 0}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            onKeyDown={(e) => onKey(i, e)}
            onPaste={onPaste}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, '').slice(-1);
              const next = chars.slice();
              next[i] = digit;
              commit(next.join(''));
              if (digit && i < length - 1) refs.current[i + 1]?.focus();
            }}
            className={cn(
              'h-14 w-11 rounded-card border border-border bg-surface text-center text-xl text-ink sm:w-12',
              error && 'border-danger',
            )}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
