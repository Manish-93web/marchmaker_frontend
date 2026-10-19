import { Banner, Button, Input, OtpInput } from '@marchmaker/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useState, type ReactNode } from 'react';
import { api, ApiRequestError } from '../lib/api';
import { STAFF_KEY, errorMessage, fetchMe, type StaffMe } from '../lib/session';

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askTotp, setAskTotp] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recovery, setRecovery] = useState('');

  const submit = async (code?: string) => {
    setBusy(true);
    setError(null);
    try {
      await api('/auth/login', { method: 'POST', body: { email, password, ...(useRecovery ? { recoveryCode: recovery } : code ? { totp: code } : {}) } });
      onDone();
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'TOTP_REQUIRED') setAskTotp(true);
      else setError(errorMessage(e));
      setTotp('');
      setRecovery('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container max-w-md py-16">
      <h1 className="font-display text-2xl text-primary">Marchmaker Admin</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(askTotp && !useRecovery ? totp : undefined);
        }}
      >
        {error && <Banner tone="danger">{error}</Banner>}
        <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {askTotp && !useRecovery && (
          <OtpInput label="Authenticator code" value={totp} onChange={setTotp} onComplete={(c) => void submit(c)} autoFocus />
        )}
        {askTotp && useRecovery && (
          <Input
            label="Recovery code"
            hint="One of the ten codes you saved when you set up two-factor. Each works once."
            autoComplete="off"
            autoCapitalize="characters"
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
            autoFocus
          />
        )}
        {askTotp && (
          <button type="button" className="text-sm underline" onClick={() => setUseRecovery((v) => !v)}>
            {useRecovery ? 'Use my authenticator app instead' : 'I cannot use my authenticator app'}
          </button>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Sign in
        </Button>
      </form>
    </main>
  );
}

function TotpSetup({ secret, otpauthUrl, onDone }: { secret: string; otpauthUrl: string; onDone: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);

  const confirm = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ recoveryCodes?: string[] }>('/auth/2fa/confirm', { method: 'POST', body: { code: value } });
      // The codes are shown once, here, before the console opens.
      if (res.recoveryCodes?.length) setCodes(res.recoveryCodes);
      else onDone();
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (codes) {
    const text = codes.join('\n');
    return (
      <main className="container max-w-md space-y-6 py-16">
        <h1 className="font-display text-2xl text-primary">Save your recovery codes</h1>
        <p className="text-muted">
          If you lose your phone, each of these codes lets you sign in once. They are shown only now. Keep them somewhere safe, away from your password.
        </p>
        <ul aria-label="Recovery codes" className="grid grid-cols-2 gap-2 rounded-card border border-border p-4 font-mono text-lg">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(text)}>
            Copy
          </Button>
          <a
            className="inline-flex min-h-[44px] items-center rounded-pill border border-border px-4 text-sm"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Marchmaker recovery codes\n\n${text}\n`)}`}
            download="marchmaker-recovery-codes.txt"
          >
            Download
          </a>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          I have saved these codes
        </label>
        <Button disabled={!saved} onClick={onDone}>
          Continue to the console
        </Button>
      </main>
    );
  }

  return (
    <main className="container max-w-md space-y-6 py-16">
      <h1 className="font-display text-2xl text-primary">Set up two-factor authentication</h1>
      <p className="text-muted">
        Staff accounts require an authenticator app. Scan the code, then enter the 6-digit code it shows.
      </p>
      <div className="inline-block rounded-card bg-white p-4">
        <QRCodeSVG value={otpauthUrl} size={176} title="Authenticator setup code" />
      </div>
      <p className="text-sm">
        Cannot scan? Enter this key manually: <code className="break-all">{secret}</code>
      </p>
      {error && <Banner tone="danger">{error}</Banner>}
      <OtpInput value={code} onChange={setCode} onComplete={(c) => void confirm(c)} disabled={busy} autoFocus />
    </main>
  );
}

/** Resolves who is signed in and what they must still do (sign in, enrol TOTP) before the console shows. */
export function AuthGate({ children }: { children: (me: StaffMe) => ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: STAFF_KEY, queryFn: fetchMe, retry: false, staleTime: 30_000 });
  const needsSetup = !!me.data && !me.data.mfa;
  const setup = useQuery({
    queryKey: ['totp-setup', me.data?.id],
    queryFn: () => api<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup', { method: 'POST' }),
    enabled: needsSetup,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: STAFF_KEY });

  if (me.isLoading) return <p className="container py-16">Loading…</p>;
  if (!me.data) return <SignIn onDone={() => void refresh()} />;
  if (!me.data.roles.some((r) => r !== 'member')) {
    void api('/auth/logout', { method: 'POST' }).finally(() => void refresh());
    return <p className="container py-16">This account does not have access to the console.</p>;
  }
  if (needsSetup) {
    if (setup.isError) {
      return (
        <main className="container max-w-md space-y-4 py-16">
          <Banner tone="danger">We could not start two-factor setup. Your sign-in may be out of date. Sign out and sign in again.</Banner>
          <Button onClick={() => void api('/auth/logout', { method: 'POST' }).finally(() => void refresh())}>Sign out</Button>
        </main>
      );
    }
    if (!setup.data) return <p className="container py-16">Preparing two-factor setup…</p>;
    return <TotpSetup secret={setup.data.secret} otpauthUrl={setup.data.otpauthUrl} onDone={() => void refresh()} />;
  }
  return <>{children(me.data)}</>;
}
