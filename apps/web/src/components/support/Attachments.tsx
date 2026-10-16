import { Button } from '@marchmaker/ui';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../../lib/api';

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;

export interface UploadedFile {
  key: string;
  name: string;
}

/**
 * Lets a person attach up to three screenshots (or a PDF, for support). Files go straight to private storage
 * with a short-lived signed URL; the server checks the key, size and owner again when the form is sent.
 */
export function AttachmentPicker({
  scope,
  files,
  onChange,
  allowPdf = false,
}: {
  scope: 'ticket' | 'report';
  files: UploadedFile[];
  onChange: (f: UploadedFile[]) => void;
  allowPdf?: boolean;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = allowPdf ? 'image/png,image/jpeg,image/webp,application/pdf' : 'image/png,image/jpeg,image/webp';

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setBusy(true);
    try {
      const next = [...files];
      for (const f of Array.from(list)) {
        if (next.length >= MAX_FILES) {
          setError(t('s.attach.tooMany', { n: MAX_FILES }));
          break;
        }
        if (f.size > MAX_BYTES) {
          setError(t('s.attach.tooBig'));
          continue;
        }
        const ticket = await api<{ key: string; upload: { url: string; method: 'PUT'; headers: Record<string, string> } }>('/support/attachments/presign', {
          method: 'POST',
          body: { scope, contentType: f.type, size: f.size, name: f.name.slice(0, 100) },
        });
        const res = await fetch(ticket.upload.url, { method: 'PUT', headers: ticket.upload.headers, body: f });
        if (!res.ok) throw new Error('upload failed');
        next.push({ key: ticket.key, name: f.name });
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('s.attach.failed'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept={accept} multiple hidden onChange={(e) => void add(e.target.files)} aria-label={t('s.attach.add')} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" loading={busy} disabled={files.length >= MAX_FILES} onClick={() => input.current?.click()}>
          {t('s.attach.add')}
        </Button>
        <span className="text-xs text-muted">{t('s.attach.hint', { n: MAX_FILES })}</span>
      </div>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {files.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-2 rounded bg-surface-2 px-3 py-1">
              <span className="truncate">{f.name}</span>
              <button type="button" className="min-h-[32px] px-2 text-muted underline" onClick={() => onChange(files.filter((x) => x.key !== f.key))}>
                {t('s.attach.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
