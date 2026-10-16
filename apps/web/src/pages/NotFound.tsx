import { Button, EmptyState } from '@marchmaker/ui';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="container py-20">
      <EmptyState
        title={t('notFound.title')}
        action={
          <Link to="/">
            <Button variant="outline">{t('notFound.back')}</Button>
          </Link>
        }
      />
    </div>
  );
}
