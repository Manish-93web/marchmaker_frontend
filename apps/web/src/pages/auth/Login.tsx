import { safeInternalPath } from '../../lib/safePath';
import { zodResolver } from '@hookform/resolvers/zod';
import { Banner, Button, Input } from '@marchmaker/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { GoogleSignIn } from '../../components/GoogleSignIn';
import { api, ApiRequestError } from '../../lib/api';
import { ME_KEY } from '../../lib/auth';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
  totp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code').optional().or(z.literal('')),
});
type Values = z.infer<typeof schema>;

export function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const [needTotp, setNeedTotp] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api('/auth/login', {
        method: 'POST',
        body: { email: v.email, password: v.password, ...(v.totp ? { totp: v.totp } : {}) },
      });
      await qc.invalidateQueries({ queryKey: ME_KEY });
      const from = (loc.state as { from?: string } | null)?.from;
      nav(safeInternalPath(from), { replace: true });
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'TOTP_REQUIRED') {
        setNeedTotp(true);
        return;
      }
      setFormError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
    }
  });

  return (
    <AuthLayout hideHeading title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <GoogleSignIn mode="signin" />
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {formError && <Banner tone="danger">{formError}</Banner>}
        <Input
          label={t('auth.login.email')}
          type="email"
          className="py-2"
          autoComplete="username"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label={t('auth.login.password')}
          type="password"
          className="py-2"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {needTotp && (
          <Input
            label={t('auth.login.totp')}
            hint={t('auth.login.totpHint')}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            error={errors.totp?.message}
            {...register('totp')}
          />
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('auth.login.submit')}
        </Button>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link className="text-primary underline" to="/forgot-password">
            {t('auth.login.forgot')}
          </Link>
          <Link className="text-primary underline" to="/login/code">
            {t('auth.login.useCode')}
          </Link>
          <p className="text-muted">
            {t('auth.login.noAccount')}{' '}
            <Link className="text-primary underline" to="/register">
              {t('auth.login.create')}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
