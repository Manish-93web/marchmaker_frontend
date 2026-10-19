import { Chip, Input, Textarea } from '@marchmaker/ui';
import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FieldDef } from '../../lib/profileFields';
import { VoiceInput } from './VoiceInput';

interface Props {
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
}

/** "Why we ask" disclosure: a button that toggles an inline explanation (works on touch). */
function Why({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-pill text-muted hover:text-ink"
        aria-label="Why we ask"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <span id={id} className="mt-1 block text-sm text-muted">
          {text}
        </span>
      )}
    </span>
  );
}

export function FieldControl({ def, value, onChange, onBlur, error, disabled }: Props) {
  const { t } = useTranslation();
  const label = t(`p.f.${def.name}`);
  const why = def.why ? <Why text={t(`p.why.${def.name}`)} /> : null;
  const str = value === undefined || value === null ? '' : String(value);
  const required = def.required ? ' *' : '';

  if (def.kind === 'chips' || def.kind === 'boolean') {
    const options =
      def.kind === 'boolean' ? ['true', 'false'] : (def.options ?? []);
    const current = def.kind === 'boolean' ? (value === undefined ? '' : String(value)) : str;
    return (
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium text-ink">
          {label}
          {required}
          {why}
        </legend>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip
              key={o}
              selected={current === o}
              onClick={() => {
                const next = def.kind === 'boolean' ? o === 'true' : o;
                onChange(current === o ? null : next);
                onBlur();
              }}
            >
              {t(`p.o.${def.name}.${o}`)}
            </Chip>
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

  if (def.kind === 'select') {
    const id = `f-${def.name}`;
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
          {required}
          {why}
        </label>
        <select
          id={id}
          value={str}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value || null);
            onBlur();
          }}
          className="min-h-[44px] w-full rounded-card border border-border bg-surface px-4 text-base"
        >
          <option value="" />
          {def.options?.map((o) => (
            <option key={o} value={o}>
              {t(`p.o.${def.name}.${o}`)}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (def.kind === 'textarea') {
    return (
      <div className="space-y-2">
        <Textarea
          label={`${label}${required}`}
          hint={def.minLength ? t('p.minLength', { count: str.trim().length, min: def.minLength }) : undefined}
          value={str}
          maxLength={def.maxLength}
          disabled={disabled}
          error={error}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        {why}
        {def.voice && <VoiceInput value={str} disabled={disabled} onText={(t2) => onChange(t2)} />}
      </div>
    );
  }

  const listId = def.kind === 'suggest' ? `dl-${def.name}` : undefined;
  return (
    <div>
      <Input
        label={`${label}${required}`}
        type={def.kind === 'number' ? 'number' : 'text'}
        inputMode={def.kind === 'number' ? 'numeric' : undefined}
        min={def.min}
        max={def.max}
        list={listId}
        autoComplete={def.autoComplete}
        value={str}
        disabled={disabled}
        error={error}
        onChange={(e) => {
          const v = e.target.value;
          onChange(def.kind === 'number' ? (v === '' ? null : Number(v)) : v);
        }}
        onBlur={onBlur}
      />
      {why}
      {listId && (
        <datalist id={listId}>
          {def.suggestions?.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
