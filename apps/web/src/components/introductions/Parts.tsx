import { Badge, Banner, Button, Chip, Dialog } from '@marchmaker/ui';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Lock, MapPin, Briefcase } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DECLINE_REASONS, REPORT_CATEGORIES } from '@marchmaker/shared';
import { firstNoteProblems } from '@marchmaker/shared';
import type { IntroCard } from '../../lib/introductions';
import { AttachmentPicker, type UploadedFile } from '../support/Attachments';

/** Photo that stays soft until the introduction is unlocked. */
export function BlurredPhoto({ src, name, unlocked }: { src: string | null; name: string; unlocked?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-hero bg-surface-2 shadow-lg">
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className={`h-full w-full scale-110 object-cover ${unlocked ? '' : 'blur-md'}`}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : (
        <div className="grid h-full place-items-center text-4xl text-muted" aria-hidden>
          {name.slice(0, 1)}
        </div>
      )}
      {!unlocked && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-4 text-sm text-white">
          <Lock className="h-4 w-4" aria-hidden />
          {t('i.card.photoPrivate')}
        </div>
      )}
    </div>
  );
}

export function VerifiedBadges({ badges }: { badges: IntroCard['person']['badges'] }) {
  const { t } = useTranslation();
  const items = (
    [
      ['id', t('v.badges.id')],
      ['selfie', t('v.badges.selfie')],
      ['phone', t('v.badges.phone')],
    ] as const
  ).filter(([k]) => badges[k]);
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Verification">
      {items.map(([k, label]) => (
        <li key={k}>
          <Badge tone="verified">
            <BadgeCheck className="h-3 w-3" aria-hidden /> {label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function PersonFacts({ person }: { person: IntroCard['person'] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {person.city && (
        <li className="flex items-center gap-1">
          <MapPin className="h-4 w-4" aria-hidden /> {person.city}
        </li>
      )}
      {person.profession && (
        <li className="flex items-center gap-1">
          <Briefcase className="h-4 w-4" aria-hidden /> {person.profession}
        </li>
      )}
      {person.education && <li>{t(`p.o.highestEducation.${person.education}`, person.education.replace('_', ' '))}</li>}
    </ul>
  );
}

/** Small sheet: a dialog on desktop, a bottom sheet on phones. Focus is trapped and Escape closes it (Radix). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={title}>
      {children}
    </Dialog>
  );
}

export function FirstNoteSheet({
  name,
  busy,
  error,
  onSend,
  onClose,
}: {
  name: string;
  busy: boolean;
  error: string | null;
  onSend: (note: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const problems = note.trim().length === 0 ? [] : firstNoteProblems(note);
  const len = note.trim().length;
  return (
    <Sheet title={t('i.note.title')} onClose={onClose}>
      <p className="text-sm text-muted">{t('i.note.hint')}</p>
      <label className="block text-sm font-medium" htmlFor="first-note">
        {name}
      </label>
      <textarea
        id="first-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t('i.note.placeholder')}
        maxLength={600}
        aria-invalid={problems.length > 0}
        className="min-h-[160px] w-full rounded-card border border-border bg-surface p-3"
      />
      <div className="flex justify-between text-xs">
        <span className={problems.length ? 'text-danger' : 'text-muted'} role={problems.length ? 'alert' : undefined}>
          {problems[0] ?? t('i.note.minHint', { min: 50 })}
        </span>
        <span className="text-muted">{t('i.note.count', { n: len, max: 500 })}</span>
      </div>
      <Banner tone="info">{t('i.rules.body')}</Banner>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t('i.actions.cancel')}
        </Button>
        <Button loading={busy} disabled={len < 50 || problems.length > 0} onClick={() => onSend(note.trim())}>
          {t('i.actions.sendNote')}
        </Button>
      </div>
    </Sheet>
  );
}

export function DeclineSheet({
  busy,
  onConfirm,
  onClose,
}: {
  busy: boolean;
  onConfirm: (reason: string | undefined, note: string | undefined) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | undefined>();
  const [note, setNote] = useState('');
  return (
    <Sheet title={t('i.decline.title')} onClose={onClose}>
      <p className="text-sm text-muted">{t('i.decline.body')}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('i.decline.title')}>
        {DECLINE_REASONS.map((r) => (
          <Chip key={r} selected={reason === r} onClick={() => setReason(reason === r ? undefined : r)}>
            {t(`i.decline.reasons.${r}`)}
          </Chip>
        ))}
      </div>
      <label className="block text-sm font-medium">
        {t('i.decline.note')}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          className="mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-3"
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t('i.actions.cancel')}
        </Button>
        <Button loading={busy} onClick={() => onConfirm(reason, note.trim() || undefined)}>
          {t('i.decline.confirm')}
        </Button>
      </div>
    </Sheet>
  );
}

export function PaywallSheet({ onClose, to }: { onClose: () => void; to: string }) {
  const { t } = useTranslation();
  return (
    <Sheet title={t('i.paywall.title')} onClose={onClose}>
      <p className="text-muted">{t('i.paywall.body')}</p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t('i.paywall.close')}
        </Button>
        <a href={to}>
          <Button>{t('i.paywall.cta')}</Button>
        </a>
      </div>
    </Sheet>
  );
}

export function ReportSheet({
  busy,
  done,
  error,
  onSubmit,
  onBlock,
  onClose,
}: {
  busy: boolean;
  done: boolean;
  error: string | null;
  onSubmit: (category: string, details: string | undefined, alsoBlock: boolean, evidence: string[]) => void;
  onBlock: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string>('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [evidence, setEvidence] = useState<UploadedFile[]>([]);
  if (done) {
    return (
      <Sheet title={t('i.safety.reportTitle')} onClose={onClose}>
        <Banner tone="success">{t('i.safety.sent')}</Banner>
        <p className="text-sm font-medium">{t('i.safety.emergency')}</p>
        <div className="flex justify-end">
          <Button onClick={onClose}>{t('common.continue')}</Button>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title={t('i.safety.reportTitle')} onClose={onClose}>
      <p className="text-sm text-muted">{t('i.safety.reportBody')}</p>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t('i.safety.category')}</legend>
        {REPORT_CATEGORIES.map((c) => (
          <label key={c} className="flex min-h-[40px] items-center gap-2 text-sm">
            <input type="radio" name="category" checked={category === c} onChange={() => setCategory(c)} />
            {t(`i.safety.categories.${c}`)}
          </label>
        ))}
      </fieldset>
      {category === 'safety_threat' && <Banner tone="danger">{t('i.safety.emergency')}</Banner>}
      <label className="block text-sm font-medium">
        {t('i.safety.details')}
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={2000}
          className="mt-1 min-h-[80px] w-full rounded-card border border-border bg-surface p-3"
        />
      </label>
      <div>
        <p className="text-sm font-medium">{t('i.safety.evidence')}</p>
        <p className="mb-1 text-xs text-muted">{t('i.safety.evidenceHint')}</p>
        <AttachmentPicker scope="report" files={evidence} onChange={setEvidence} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
        {t('i.safety.alsoBlock')}
      </label>
      {error && <Banner tone="danger">{error}</Banner>}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onBlock}>
          {t('i.actions.block')}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('i.actions.cancel')}
          </Button>
          <Button loading={busy} disabled={!category} onClick={() => onSubmit(category, details.trim() || undefined, alsoBlock, evidence.map((f) => f.key))}>
            {t('i.safety.submit')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

/** A handful of marigold petals drift down once. Static when the member prefers reduced motion. */
export function PetalCelebration() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const petals = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {petals.map((i) => (
        <motion.span
          key={i}
          className="absolute top-0 block h-3 w-2 rounded-full bg-accent"
          style={{ left: `${(i * 97) % 100}%` }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: '105vh', opacity: [0, 1, 1, 0], rotate: 240 + i * 20, x: [0, 24, -18, 10] }}
          transition={{ duration: 3.2 + (i % 5) * 0.4, delay: (i % 7) * 0.15, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
