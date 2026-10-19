import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@marchmaker/shared';
import { Banner, Button, Input, PasswordStrength } from '@marchmaker/ui';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { GoogleSignIn } from '../../components/GoogleSignIn';
import { api } from '../../lib/api';
import { applyApiError } from '../../lib/forms';

interface Values {
  firstName: string;
  gender: 'woman' | 'man' | 'non_binary';
  dob: string;
  email: string;
  phone?: string;
  password?: string;
  acceptTerms: boolean;
}

/** The UI takes a 10-digit number; the shared schema expects +91 E.164. */
function normalise(v: Values) {
  // The form resolver hands back parsed values, where an empty mobile number is already undefined.
  const digits = (v.phone ?? '').replace(/\D/g, '').replace(/^(?:\+?91)(?=\d{10}$)/, '');
  return {
    ...v,
    email: v.email || undefined,
    phone: digits ? `+91${digits}` : undefined,
    password: v.password || undefined,
  };
}

const schemaResolver = zodResolver(registerSchema) as unknown as Resolver<Record<string, unknown>>;
const resolver: Resolver<Values> = (values, ctx, opts) =>
  schemaResolver(normalise(values), ctx, opts as never) as ReturnType<Resolver<Values>>;

export function Register() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  // The invite code arrives as ?ref=CODE and is kept until sign-up is done.
  const [ref] = useState(() => {
    const fromUrl = params.get('ref')?.trim().toUpperCase().slice(0, 32);
    try {
      if (fromUrl) sessionStorage.setItem('mm_ref', fromUrl);
      return fromUrl ?? sessionStorage.getItem('mm_ref') ?? undefined;
    } catch {
      return fromUrl;
    }
  });
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver,
    defaultValues: { gender: 'woman', acceptTerms: false, email: '', phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api('/auth/register', { method: 'POST', body: { ...normalise(v), clientType: 'web', referralCode: ref } });
      try {
        sessionStorage.removeItem('mm_ref');
      } catch {
        // ignore
      }
      setDone(true);
    } catch (e) {
      setFormError(applyApiError(e, setError) ?? null);
    }
  });

  if (done) {
    return (
      <AuthLayout title={t('auth.register.doneTitle')}>
        <p className="text-ink" role="status">
          {t('auth.register.doneBody')}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      {ref && <p className="mb-4 rounded-card bg-surface-2 p-3 text-sm">{t('r.invited')}</p>}
      <div className="mb-4">
        <GoogleSignIn mode="signup" referralCode={ref} />
      </div>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Banner tone="danger">{formError}</Banner>}
        <Input label={t('auth.register.firstName')} autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
        <div>
          <label htmlFor="gender" className="mb-1.5 block text-sm font-medium">
            {t('auth.register.gender')}
          </label>
          <select
            id="gender"
            className="min-h-[44px] w-full rounded-card border border-border bg-surface px-4 text-base"
            {...register('gender')}
          >
            <option value="woman">{t('auth.register.woman')}</option>
            <option value="man">{t('auth.register.man')}</option>
            <option value="non_binary">{t('auth.register.nonBinary')}</option>
          </select>
        </div>
        <Input
          label={t('auth.register.dob')}
          hint={t('auth.register.dobHint')}
          type="date"
          autoComplete="bday"
          error={errors.dob?.message}
          {...register('dob')}
        />
        <Input label={t('auth.register.email')} type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label={t('auth.register.phone')}
          hint={t('auth.register.phoneHint')}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="space-y-2">
          <Input
            label={t('auth.register.password')}
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength password={watch('password') ?? ''} />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-5 w-5" {...register('acceptTerms')} />
          <span>{t('auth.register.terms')}</span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="text-sm text-danger">
            Please accept the terms to continue
          </p>
        )}
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('auth.register.submit')}
        </Button>
        <p className="text-sm text-muted">
          {t('auth.register.haveAccount')}{' '}
          <Link className="text-primary underline" to="/login">
            {t('auth.login.submit')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
