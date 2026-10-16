import { Banner, Button, Input, OtpInput } from '@marchmaker/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { api, ApiRequestError } from '../../lib/api';
import { ME_KEY } from '../../lib/auth';

const COOLDOWN = 60;

export function OtpLogin() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [digits, setDigits] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const target = `+91${digits.replace(/\D/g, '')}`;
  const valid = /^\+91[6-9]\d{9}$/.test(target);

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      await api('/auth/otp/request', { method: 'POST', body: { target, purpose: 'login' } });
      setStage('code');
      setWait(COOLDOWN);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setError(null);
    setBusy(true);
    try {
      await api('/auth/otp/verify', { method: 'POST', body: { target, purpose: 'login', code: value } });
      await qc.invalidateQueries({ queryKey: ME_KEY });
      nav('/dashboard', { replace: true });
    } catch (e) {
      setCode('');
      setError(e instanceof ApiRequestError ? e.message : t('auth.otp.invalid'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t('auth.otp.title')}>
      <div className="space-y-4">
        {error && <Banner tone="danger">{error}</Banner>}
        {stage === 'phone' ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) void send();
            }}
          >
            <Input
              label={t('auth.otp.phone')}
              hint={t('auth.register.phoneHint')}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={digits}
              onChange={(e) => setDigits(e.target.value)}
            />
            <Button type="submit" className="w-full" loading={busy} disabled={!valid}>
              {t('auth.otp.send')}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <p role="status">{t('auth.otp.sent')}</p>
            <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} autoFocus />
            <Button className="w-full" loading={busy} disabled={code.length !== 6} onClick={() => void verify(code)}>
              {t('auth.otp.verify')}
            </Button>
            <Button variant="ghost" className="w-full" disabled={wait > 0 || busy} onClick={() => void send()}>
              {wait > 0 ? t('auth.otp.resendIn', { seconds: wait }) : t('auth.otp.resend')}
            </Button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
