import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const control =
  'w-full rounded-card border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted min-h-[44px] focus-visible:border-primary aria-[invalid=true]:border-danger';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  id: string;
  children: ReactNode;
}

function FieldShell({ label, hint, error, id, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  id?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, id, className, ...props }, ref) => {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell label={label} hint={hint} error={error} id={fid}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
        className={cn(control, className)}
        {...props}
      />
    </FieldShell>
  );
});
Input.displayName = 'Input';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  id?: string;
  /** Shows a live character counter when set. */
  maxLength?: number;
  value?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className, maxLength, value, ...props }, ref) => {
    const auto = useId();
    const fid = id ?? auto;
    return (
      <FieldShell label={label} hint={hint} error={error} id={fid}>
        <textarea
          ref={ref}
          id={fid}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined}
          className={cn(control, 'min-h-[120px] resize-y', className)}
          {...props}
        />
        {maxLength !== undefined && value !== undefined && (
          <p className="text-right text-xs text-muted" aria-live="polite">
            {value.length}/{maxLength}
          </p>
        )}
      </FieldShell>
    );
  },
);
Textarea.displayName = 'Textarea';
