import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@marchmaker/ui';
import { useMe } from '../lib/auth';

export function RequireAuth() {
  const { data: me, isLoading, isError, refetch } = useMe();
  const loc = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="container space-y-4 py-10" aria-busy="true" aria-label={t('common.loading')}>
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="container py-10">
        <p role="alert">{t('common.somethingWrong')}</p>
        <button className="mt-3 underline" onClick={() => void refetch()}>
          {t('common.retry')}
        </button>
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}
