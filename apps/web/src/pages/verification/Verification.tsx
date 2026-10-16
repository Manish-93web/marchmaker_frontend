import { EVIDENCE_CONTENT_TYPES, EVIDENCE_MAX_BYTES, ID_DOC_TYPES, type EvidenceKind } from '@marchmaker/shared';
import { Badge, Banner, Button, Card, Chip, Input, Skeleton } from '@marchmaker/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CameraCapture } from '../../components/verification/CameraCapture';
import { api, ApiRequestError } from '../../lib/api';
import { ME_KEY } from '../../lib/auth';

export interface VerificationStatus {
  state: 'none' | 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'reupload_requested';
  method: 'manual' | 'kyc' | null;
  docType: string | null;
  docLast4: string | null;
  uploaded: Record<EvidenceKind, boolean>;
  reuploadKinds: EvidenceKind[];
  message: string | null;
  ready: boolean;
  kycAvailable: boolean;
  badges: { id: boolean; selfie: boolean; phone: boolean; email: boolean };
  retentionDays: number;
}

const VERIFICATION_KEY = ['verification'] as const;

interface UploadTicket {
  upload: { url: string; method: 'PUT'; headers: Record<string, string> };
}

/** PUTs straight to private storage; the API never sees the image bytes. */
async function putFile(ticket: UploadTicket, blob: Blob): Promise<void> {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(ticket.upload.headers)) {
    if (k.toLowerCase() !== 'content-length') headers[k] = v;
  }
  const res = await fetch(ticket.upload.url, { method: 'PUT', headers, body: blob });
  if (!res.ok) throw new Error(`upload ${res.status}`);
}

function Badges({ badges }: { badges: VerificationStatus['badges'] }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Verification badges">
      {(['id', 'selfie', 'phone', 'email'] as const).map((k) => (
        <li key={k}>
          <Badge tone={badges[k] ? 'verified' : 'neutral'}>
            {badges[k] && <Check className="h-3 w-3" aria-hidden />}
            {t(`v.badges.${k}`)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function ImageUpload({
  kind,
  label,
  done,
  disabled,
  onFile,
  busy,
}: {
  kind: EvidenceKind;
  label: string;
  done: boolean;
  disabled: boolean;
  busy: boolean;
  onFile: (kind: EvidenceKind, file: Blob) => void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const id = `file-${kind}`;
  return (
    <div className="rounded-card border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {done && (
          <Badge tone="verified">
            <Check className="h-3 w-3" aria-hidden /> {t('v.upload.done')}
          </Badge>
        )}
      </div>
      <input
        id={id}
        type="file"
        accept={EVIDENCE_CONTENT_TYPES.join(',')}
        disabled={disabled || busy}
        className="mt-3 block w-full text-sm file:mr-3 file:min-h-[40px] file:rounded-pill file:border-0 file:bg-primary file:px-4 file:text-primary-fg"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setError(null);
          if (!(EVIDENCE_CONTENT_TYPES as readonly string[]).includes(f.type)) return setError(t('v.upload.badType'));
          if (f.size > EVIDENCE_MAX_BYTES) return setError(t('v.upload.tooBig'));
          onFile(kind, f);
        }}
      />
      {busy && <p className="mt-2 text-sm text-muted">{t('v.upload.uploading')}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Verification() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: VERIFICATION_KEY,
    queryFn: () => api<VerificationStatus>('/verification/status'),
    staleTime: 0,
    refetchOnWindowFocus: true,
    // Coming back from the partner's hosted page, the result arrives a moment later: check every few seconds.
    refetchInterval: (query) => (query.state.data?.method === 'kyc' && query.state.data.state === 'pending' ? 5_000 : false),
  });
  const [docType, setDocType] = useState<string>('');
  const [last4, setLast4] = useState('');
  const [busyKind, setBusyKind] = useState<EvidenceKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: VERIFICATION_KEY });
  const fail = (e: unknown) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));

  const upload = useMutation({
    mutationFn: async ({ kind, blob }: { kind: EvidenceKind; blob: Blob }) => {
      const type = blob.type || 'image/jpeg';
      const ticket = await api<UploadTicket>('/verification/upload-url', {
        method: 'POST',
        body: { kind, contentType: type, sizeBytes: blob.size },
      });
      await putFile(ticket, blob);
    },
    onMutate: ({ kind }) => {
      setBusyKind(kind);
      setError(null);
    },
    onSuccess: refresh,
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('v.upload.failed')),
    onSettled: () => setBusyKind(null),
  });

  const submit = useMutation({
    mutationFn: () =>
      api<VerificationStatus>('/verification/submit', {
        method: 'POST',
        body: { docType: docType || q.data?.docType, docLast4: (last4 || q.data?.docLast4 || '').trim() },
      }),
    onSuccess: (s) => {
      qc.setQueryData(VERIFICATION_KEY, s);
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
    onError: fail,
  });

  const kyc = useMutation({
    mutationFn: () => api<{ redirectUrl: string }>('/verification/kyc/session', { method: 'POST' }),
    onSuccess: (r) => {
      window.location.assign(r.redirectUrl);
    },
    onError: (e) =>
      setError(e instanceof ApiRequestError && e.status === 503 ? t('v.kyc.unavailable') : e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });

  if (q.isLoading) {
    return (
      <div className="container max-w-2xl space-y-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="container max-w-2xl py-10">
        <Banner tone="danger">{t('common.somethingWrong')}</Banner>
      </div>
    );
  }
  const s = q.data;
  const days = s.retentionDays;

  const header = (
    <>
      <h1 className="font-display text-2xl text-primary">{t('v.title')}</h1>
      <p className="mt-1 text-muted">{t('v.intro')}</p>
      <p className="mt-3 flex items-start gap-2 text-sm text-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
        {t('v.privacy', { days })}
      </p>
    </>
  );

  if (!s.ready && s.state === 'none') {
    return (
      <div className="container max-w-2xl py-8">
        {header}
        <Card className="mt-6">
          <h2 className="font-display text-xl">{t('v.notReady.title')}</h2>
          <p className="mt-2 text-muted">{t('v.notReady.body')}</p>
        </Card>
      </div>
    );
  }

  if (s.state === 'approved') {
    return (
      <div className="container max-w-2xl py-8">
        {header}
        <Card className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-secondary" aria-hidden />
            <h2 className="font-display text-xl">{t('v.state.approved.title')}</h2>
          </div>
          <p className="text-muted">{t('v.state.approved.body')}</p>
          <Badges badges={s.badges} />
          <Link to="/dashboard">
            <Button variant="outline">{t('nav.dashboard')}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (s.state === 'pending' || s.state === 'in_review') {
    const copy = t(`v.state.${s.state}.title`);
    return (
      <div className="container max-w-2xl py-8">
        {header}
        <Card className="mt-6 space-y-3" aria-live="polite">
          <h2 className="font-display text-xl">{copy}</h2>
          <p className="text-muted">{t(`v.state.${s.state}.body`)}</p>
          {s.method === 'kyc' && s.state === 'pending' && (
            <p role="status" className="text-sm">
              {t('v.kyc.checking')}
            </p>
          )}
          <Badges badges={s.badges} />
        </Card>
      </div>
    );
  }

  // draft / none / rejected / reupload_requested: the member has something to do.
  const reupload = s.state === 'reupload_requested';
  const need = reupload ? s.reuploadKinds : (['id_front', 'id_back', 'selfie'] as EvidenceKind[]);
  const allDone = need.every((k) => s.uploaded[k]);
  const docOk = reupload || (!!docType && /^[A-Za-z0-9]{4}$/.test(last4.trim()));
  const missingLabels = need.filter((k) => !s.uploaded[k]).map((k) => t(`v.kinds.${k}`));
  const send = (kind: EvidenceKind, blob: Blob) => upload.mutate({ kind, blob });

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      {header}

      {s.state === 'rejected' && (
        <Banner tone="warning">
          <p className="font-medium">{t('v.state.rejected.title')}</p>
          {s.message && <p className="mt-1">{s.message}</p>}
        </Banner>
      )}
      {reupload && (
        <Banner tone="info">
          <p className="font-medium">{t('v.state.reupload_requested.title')}</p>
          <p className="mt-1">
            {t('v.state.reupload_requested.body')} {s.reuploadKinds.map((k) => t(`v.kinds.${k}`)).join(', ')}
          </p>
        </Banner>
      )}
      {error && <Banner tone="danger">{error}</Banner>}

      {s.kycAvailable && !reupload && (
        <Card className="space-y-3">
          <h2 className="font-display text-xl">{t('v.kyc.title')}</h2>
          <p className="text-muted">{t('v.kyc.body')}</p>
          <Button loading={kyc.isPending} onClick={() => kyc.mutate()}>
            {t('v.kyc.start')}
          </Button>
          <p className="text-sm text-muted">{t('v.kyc.or')}</p>
        </Card>
      )}

      {!reupload && (
        <Card className="space-y-4">
          <h2 className="font-display text-xl">{t('v.doc.title')}</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('v.doc.title')}>
            {ID_DOC_TYPES.map((d) => (
              <Chip key={d} selected={docType === d} onClick={() => setDocType(d)}>
                {t(`v.doc.types.${d}`)}
              </Chip>
            ))}
          </div>
          {docType === 'aadhaar_masked' && <Banner tone="info">{t('v.doc.aadhaarNote')}</Banner>}
          <Input
            label={t('v.doc.last4')}
            hint={t('v.doc.last4Hint')}
            maxLength={4}
            value={last4}
            autoComplete="off"
            onChange={(e) => setLast4(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
          />
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="font-display text-xl">{t('v.steps.upload')}</h2>
        <p className="text-sm text-muted">{t('v.upload.tips')}</p>
        {need.includes('id_front') && (
          <ImageUpload
            kind="id_front"
            label={t('v.upload.front')}
            done={s.uploaded.id_front}
            disabled={false}
            busy={busyKind === 'id_front'}
            onFile={send}
          />
        )}
        {need.includes('id_back') && (
          <ImageUpload
            kind="id_back"
            label={t('v.upload.back')}
            done={s.uploaded.id_back}
            disabled={false}
            busy={busyKind === 'id_back'}
            onFile={send}
          />
        )}
      </Card>

      {need.includes('selfie') && (
        <Card className="space-y-4">
          <h2 className="font-display text-xl">{t('v.selfie.title')}</h2>
          {s.uploaded.selfie && (
            <Badge tone="verified">
              <Check className="h-3 w-3" aria-hidden /> {t('v.upload.done')}
            </Badge>
          )}
          <CameraCapture
            disabled={busyKind === 'selfie'}
            onCapture={(blob) => send('selfie', blob)}
            onPickFile={(f) => {
              if (!(EVIDENCE_CONTENT_TYPES as readonly string[]).includes(f.type)) return setError(t('v.upload.badType'));
              if (f.size > EVIDENCE_MAX_BYTES) return setError(t('v.upload.tooBig'));
              send('selfie', f);
            }}
          />
          {busyKind === 'selfie' && <p className="text-sm text-muted">{t('v.upload.uploading')}</p>}
        </Card>
      )}

      <Card className="space-y-3">
        <h2 className="font-display text-xl">{t('v.review.title')}</h2>
        <p className="text-muted">{t('v.review.body')}</p>
        {!allDone && <p className="text-sm text-muted">{t('v.review.missing', { items: missingLabels.join(', ') })}</p>}
        <Button size="lg" disabled={!allDone || !docOk} loading={submit.isPending} onClick={() => submit.mutate()}>
          {reupload ? t('v.state.reupload_requested.submit') : t('v.review.submit')}
        </Button>
      </Card>
    </div>
  );
}
