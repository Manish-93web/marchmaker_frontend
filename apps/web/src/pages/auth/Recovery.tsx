import { zodResolver } from '@hookform/resolvers/zod';
import { passwordSchema } from '@marchmaker/shared';
import { Banner, Button, Input, PasswordStrength } from '@marchmaker/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AuthLayout } from '../../components/AuthLayout';
import { api, ApiRequestError } from '../../lib/api';

const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email') });

export function ForgotPassword() {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  if (done) {
    return (
      <AuthLayout title={t('auth.forgot.doneTitle')} subtitle={t('auth.forgot.doneBody')}>
        <Link to="/login" className="text-primary underline">
          {t('nav.signIn')}
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          await api('/auth/password/forgot', { method: 'POST', body: v }).catch(() => undefined);
          setDone(true); // identical outcome whether or not the account exists
        })}
      >
        <Input label={t('auth.login.email')} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('auth.forgot.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}

const resetSchema = z.object({ password: passwordSchema });

export function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  if (done) {
    return (
      <AuthLayout title={t('auth.reset.doneTitle')} subtitle={t('auth.reset.doneBody')}>
        <Link to="/login">
          <Button>{t('nav.signIn')}</Button>
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t('auth.reset.title')}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={handleSubmit(async (v) => {
          setFormError(null);
          try {
            await api('/auth/password/reset', { method: 'POST', body: { token, password: v.password } });
            setDone(true);
          } catch (e) {
            setFormError(e instanceof ApiRequestError ? e.message : t('common.somethingWrong'));
          }
        })}
      >
        {formError && <Banner tone="danger">{formError}</Banner>}
        <Input
          label={t('auth.reset.password')}
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordStrength password={watch('password') ?? ''} />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
