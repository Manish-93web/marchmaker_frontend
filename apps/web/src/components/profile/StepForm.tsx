import { Textarea } from '@marchmaker/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
          : state === 'error'
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

  const { state, queue, flush, fieldErrors } = useAutosave({
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
    </form>
  );
}
