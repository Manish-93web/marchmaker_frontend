import { Banner, Button, Input, PasswordStrength } from '@marchmaker/ui';
import { useState } from 'react';
import { api } from '../lib/api';
import { errorMessage } from '../lib/session';

/** Reached from an invitation or reset link; works while signed out. */
export function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== password;
  const valid =
    password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && !mismatch && confirm.length > 0;

  if (done) {
    return (
      <main className="container max-w-md space-y-4 py-16">
        <h1 className="font-display text-2xl text-primary">Password set</h1>
        <p className="text-muted">You can sign in now. You will be asked to set up two-factor authentication the first time.</p>
        <a href="/" className="inline-block rounded-pill bg-primary px-6 py-3 text-primary-fg">
          Go to sign in
        </a>
      </main>
    );
  }

  return (
    <main className="container max-w-md py-16">
      <h1 className="font-display text-2xl text-primary">Set your password</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api('/auth/password/reset', { method: 'POST', body: { token, password } });
            setDone(true);
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {!token && <Banner tone="danger">This link is missing its token. Please use the link from your email.</Banner>}
        {error && <Banner tone="danger">{error}</Banner>}
        <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength password={password} />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={mismatch ? 'The passwords do not match' : undefined}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" className="w-full" loading={busy} disabled={!valid || !token}>
          Save password
        </Button>
      </form>
    </main>
  );
}
