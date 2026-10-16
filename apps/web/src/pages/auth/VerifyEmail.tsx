import { Button } from '@marchmaker/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { api } from '../../lib/api';
import { ME_KEY } from '../../lib/auth';

export function VerifyEmail() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const qc = useQueryClient();

  // Links are single use, so the request must run exactly once (no retries, no refetch).
  const { isLoading, isSuccess } = useQuery({
    queryKey: ['verify-email', token],
    enabled: token.length > 0,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const r = await api<{ verified: boolean }>('/auth/verify-email', { method: 'POST', body: { token } });
      await qc.invalidateQueries({ queryKey: ME_KEY });
      return r;
    },
  });

  if (isLoading) {
    return (
      <AuthLayout title={t('auth.verify.verifying')}>
        <p aria-live="polite">{t('common.loading')}</p>
      </AuthLayout>
    );
  }
  if (isSuccess) {
    return (
      <AuthLayout title={t('auth.verify.okTitle')} subtitle={t('auth.verify.okBody')}>
        <Link to="/dashboard">
          <Button>{t('auth.verify.continue')}</Button>
        </Link>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t('auth.verify.failTitle')} subtitle={t('auth.verify.failBody')}>
      <Link to="/login">
        <Button variant="outline">{t('nav.signIn')}</Button>
      </Link>
    </AuthLayout>
  );
}
