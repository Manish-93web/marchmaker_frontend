import { Button, Textarea } from '@marchmaker/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAutosave, type SaveState } from '../../lib/autosave';
import { PROFILE_KEY, type ProfileDoc } from '../../lib/profile';
import { PROMPT_IDS, STEP_FIELDS } from '../../lib/profileFields';
import { FieldControl } from './FieldControls';
import type { ProfileStep } from '@marchmaker/shared';

type Values = Record<string, unknown>;
type FormStep = Exclude<ProfileStep, 'photos'>;

function SaveIndicator({ state }: { state: SaveState }) {
  const { t } = useTranslation();
  const text =
    state === 'saving'
      ? t('p.autosave.saving')
      : state === 'saved'
        ? t('p.autosave.saved')
        : state === 'offline'
          ? t('p.autosave.offline')
          : state === 'error' || state === 'conflict'
            ? t('p.autosave.error')
            : '';
  return (
    <p
      role="status"
      aria-live="polite"
      className={`min-h-[1.25rem] text-sm ${state === 'error' || state === 'offline' ? 'text-danger' : 'text-muted'}`}
    >
      {text}
    </p>
  );
}

function ConflictDialog({
  mine,
  theirs,
  onApply,
}: {
  mine: Values;
  theirs: Values;
  onApply: (merged: Values) => void;
}) {
  const { t } = useTranslation();
  // `mine` holds only the fields this member edited, so only those can conflict. Fields the
  // other device changed that this one never touched simply keep the saved value.
  const keys = Object.keys(mine).filter((k) => JSON.stringify(mine[k] ?? null) !== JSON.stringify(theirs[k] ?? null));
  const [choice, setChoice] = useState<Record<string, 'mine' | 'theirs'>>(() =>
    Object.fromEntries(keys.map((k) => [k, 'mine' as const])),
  );
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const show = (v: unknown) => (v === undefined || v === null || v === '' ? t('p.conflict.empty') : String(v));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-title"
        className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-hero bg-surface p-6 shadow-lg"
      >
        <h2 id="conflict-title" className="font-display text-xl text-primary">
          {t('p.conflict.title')}
        </h2>
        <p className="text-muted">{t('p.conflict.body')}</p>
        <ul className="space-y-4">
          {keys.map((k) => (
            <li key={k}>
              <p className="text-sm font-medium">{t(`p.f.${k}`, k)}</p>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {(['mine', 'theirs'] as const).map((side) => (
                  <label
                    key={side}
                    className={`flex cursor-pointer gap-2 rounded-card border p-3 text-sm ${
                      choice[k] === side ? 'border-primary bg-surface-2' : 'border-border'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`c-${k}`}
                      checked={choice[k] === side}
                      onChange={() => setChoice((c) => ({ ...c, [k]: side }))}
                    />
                    <span>
                      <span className="block text-xs text-muted">{t(`p.conflict.${side}`)}</span>
                      {show(side === 'mine' ? mine[k] : theirs[k])}
                    </span>
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <Button
          ref={first}
          onClick={() => {
            const merged: Values = {};
            for (const k of keys) merged[k] = (choice[k] === 'mine' ? mine[k] : theirs[k]) ?? null;
            onApply(merged);
          }}
        >
          {t('p.conflict.apply')}
        </Button>
      </div>
    </div>
  );
}

interface Props {
  step: FormStep;
  doc: ProfileDoc;
  locked: boolean;
  onDoc: (doc: ProfileDoc) => void;
}

export function StepForm({ step, doc, locked, onDoc }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [values, setValues] = useState<Values>(() => ({ ...(doc.data[step] ?? {}) }));

  const { state, queue, flush, conflict, resolve, fieldErrors } = useAutosave({
    step,
    initialVersion: doc.version,
    getVersion: () => qc.getQueryData<ProfileDoc>(PROFILE_KEY)?.version,
    onSaved: (d) => {
      qc.setQueryData(PROFILE_KEY, d);
      onDoc(d);
    },
  });

  const set = (name: string, v: unknown) => {
    setValues((cur) => ({ ...cur, [name]: v }));
    queue({ [name]: v });
  };

  const prompts = (Array.isArray(values.prompts) ? values.prompts : []) as { promptId: string; answer: string }[];
  const setPrompt = (promptId: string, answer: string) => {
    const next = [...prompts.filter((p) => p.promptId !== promptId), ...(answer ? [{ promptId, answer }] : [])];
    setValues((cur) => ({ ...cur, prompts: next }));
    queue({ prompts: next });
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()} aria-describedby="save-status">
      <div id="save-status">
        <SaveIndicator state={state} />
      </div>
      {STEP_FIELDS[step].map((def) => (
        <FieldControl
          key={def.name}
          def={def}
          value={values[def.name]}
          disabled={locked}
          error={fieldErrors[def.name]}
          onChange={(v) => set(def.name, v)}
          onBlur={() => void flush()}
        />
      ))}
      {step === 'about' && (
        <fieldset className="space-y-4" disabled={locked}>
          <legend className="text-sm font-medium">{t('p.prompts.title')}</legend>
          {PROMPT_IDS.map((id) => (
            <Textarea
              key={id}
              label={t(`p.prompts.${id}`)}
              maxLength={400}
              value={prompts.find((p) => p.promptId === id)?.answer ?? ''}
              onChange={(e) => setPrompt(id, e.target.value)}
              onBlur={() => void flush()}
            />
          ))}
        </fieldset>
      )}
      {conflict && (
        <ConflictDialog
          mine={conflict.mine}
          theirs={conflict.theirs}
          onApply={(merged) => {
            setValues((cur) => ({ ...cur, ...merged }));
            void resolve(merged);
          }}
        />
      )}
    </form>
  );
}
