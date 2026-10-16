import { phoneSchema } from '@marchmaker/shared';
import { Banner, Button, Card, Input, OtpInput } from '@marchmaker/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, ApiRequestError } from '../lib/api';
import { ME_KEY } from '../lib/auth';

/**
 * Changing the phone number proves the new number with a one-time code before anything is replaced, so a
 * typo or someone else's number can never become the sign-in number. The old number keeps working until then.
 */
export function PhoneChange({ masked, verified }: { masked: string | null; verified: boolean }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'enter' | 'code' | 'done'>('enter');
  const [error, setError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: (target: string) => api('/auth/otp/request', { method: 'POST', body: { target, purpose: 'change_contact' } }),
    onSuccess: () => {
      setStep('code');
      setError(null);
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });
  const verify = useMutation({
    mutationFn: (v: { target: string; code: string }) => api('/auth/otp/verify', { method: 'POST', body: { ...v, purpose: 'change_contact' } }),
    onSuccess: () => {
      setStep('done');
      setError(null);
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong')),
  });

  const start = () => {
    const parsed = phoneSchema.safeParse(phone.trim());
    if (!parsed.success) {
      setError(t('settings.phone.invalid'));
      return;
    }
    setError(null);
    request.mutate(parsed.data);
  };

  return (
    <Card className="space-y-4">
      <h2 className="font-medium">{t('settings.phone.title')}</h2>
      <p className="text-sm text-muted">{masked ? t('settings.phone.current', { phone: masked, state: verified ? t('settings.phone.verified') : t('settings.phone.unverified') }) : t('settings.phone.none')}</p>
      {step === 'enter' && (
        <>
          <Input label={t('settings.phone.new')} type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} hint={t('settings.phone.hint')} />
          <Button loading={request.isPending} disabled={!phone.trim()} onClick={start}>
            {t('settings.phone.sendCode')}
          </Button>
        </>
      )}
      {step === 'code' && (
        <>
          <p className="text-sm">{t('settings.phone.sent', { phone: phone.trim() })}</p>
          <OtpInput value={code} onChange={setCode} label={t('settings.phone.code')} onComplete={(c) => verify.mutate({ target: phone.trim(), code: c })} autoFocus />
          <div className="flex gap-2">
            <Button loading={verify.isPending} disabled={code.length !== 6} onClick={() => verify.mutate({ target: phone.trim(), code })}>
              {t('settings.phone.confirm')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep('enter');
                setCode('');
              }}
            >
              {t('settings.phone.back')}
            </Button>
          </div>
        </>
      )}
      {step === 'done' && <Banner tone="success">{t('settings.phone.done')}</Banner>}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
