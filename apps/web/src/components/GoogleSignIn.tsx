import { Banner, Button, Input } from '@marchmaker/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiRequestError } from '../lib/api';
import { ME_KEY } from '../lib/auth';
import { loadGoogleIdentity } from '../lib/google';
import { safeInternalPath } from '../lib/safePath';

interface Pending {
  credential: string;
  email: string;
  firstName: string;
}

/**
 * "Sign in with Google" on the sign-in and sign-up pages. Google draws the button itself (its own logo and wording, as
 * its brand rules require) and hands back a signed credential, which the API verifies. A brand-new person is asked for
 * the two things Google does not share (birth date, gender) and to accept the terms before the account is made.
 * Nothing shows until the API reports a Google client id.
 */
export function GoogleSignIn({ mode, referralCode }: { mode: 'signin' | 'signup'; referralCode?: string }) {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const holder = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gender, setGender] = useState<'woman' | 'man' | 'non_binary'>('woman');
  const [dob, setDob] = useState('');
  const [accept, setAccept] = useState(false);

  const meta = useQuery({
    queryKey: ['meta-google'],
    queryFn: () => api<{ googleClientId?: string | null }>('/meta'),
    staleTime: Infinity,
    retry: false,
  });
  const clientId = meta.data?.googleClientId ?? null;

  async function submit(credential: string, extra: Record<string, unknown> = {}) {
    setError(null);
    setBusy(true);
    try {
      await api('/auth/google', { method: 'POST', body: { credential, referralCode, ...extra } });
      await qc.invalidateQueries({ queryKey: ME_KEY });
      nav(safeInternalPath((loc.state as { from?: string } | null)?.from), { replace: true });
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'PROFILE_NEEDED') {
        const d = (e.details ?? {}) as { email?: string; firstName?: string };
        setPending({ credential, email: d.email ?? '', firstName: d.firstName ?? '' });
      } else {
        setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!clientId || pending || !holder.current) return;
    let cancelled = false;
    const el = holder.current;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (r) => void submit(r.credential),
          ux_mode: 'popup',
          use_fedcm_for_prompt: true,
        });
        el.innerHTML = '';
        google.accounts.id.renderButton(el, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          logo_alignment: 'left',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          width: Math.min(400, Math.max(200, Math.floor(el.clientWidth) || 320)),
          locale: i18n.language.startsWith('hi') ? 'hi' : 'en',
        });
      })
      .catch(() => {
        if (!cancelled) setError(t('auth.google.unavailable'));
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, pending, mode, i18n.language]);

  if (!clientId) {
    // Only while developing: show where the button will be, with Google's logo, and say what is missing.
    if (!import.meta.env.DEV || meta.isLoading) return null;
    return (
      <div className="space-y-2">
        <button type="button" disabled className="flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-3 rounded-pill border border-border bg-surface px-4 text-sm font-medium opacity-70">
          <GoogleLogo />
          {mode === 'signup' ? t('auth.google.signup') : t('auth.google.signin')}
        </button>
        <p className="text-center text-xs text-muted">{t('auth.google.devNote')}</p>
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          {t('auth.google.or')}
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <form
        className="space-y-4 rounded-card border border-border p-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!dob) return setError(t('auth.google.needDob'));
          if (!accept) return setError(t('auth.google.needTerms'));
          void submit(pending.credential, { gender, dob, acceptTerms: true });
        }}
      >
        <div>
          <h2 className="font-display text-lg text-primary">{t('auth.google.finish', { name: pending.firstName })}</h2>
          <p className="text-sm text-muted">{t('auth.google.finishBody', { email: pending.email })}</p>
        </div>
        {error && <Banner tone="danger">{error}</Banner>}
        <div>
          <label htmlFor="g-gender" className="mb-1.5 block text-sm font-medium">
            {t('auth.register.gender')}
          </label>
          <select id="g-gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className="min-h-[44px] w-full rounded-card border border-border bg-surface px-4 text-base">
            <option value="woman">{t('auth.register.woman')}</option>
            <option value="man">{t('auth.register.man')}</option>
            <option value="non_binary">{t('auth.register.nonBinary')}</option>
          </select>
        </div>
        <Input label={t('auth.register.dob')} hint={t('auth.register.dobHint')} type="date" autoComplete="bday" value={dob} onChange={(e) => setDob(e.target.value)} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>{t('auth.register.terms')}</span>
        </label>
        <div className="flex gap-3">
          <Button type="submit" loading={busy}>
            {t('auth.google.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPending(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Banner tone="danger">{error}</Banner>}
      <div ref={holder} className="flex min-h-[44px] w-full justify-center" aria-busy={busy} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {t('auth.google.or')}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

/** Google's multicolour "G" mark. */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
