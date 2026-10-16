import { Button, Card } from '@marchmaker/ui';
import { useTranslation } from 'react-i18next';
import { useInstallPrompt } from '../../lib/pwa';

/** Offers "add to home screen" only where it can work, and says nothing when already installed. */
export function InstallCard() {
  const { t } = useTranslation();
  const { installed, canPrompt, ios, install } = useInstallPrompt();
  if (installed || (!canPrompt && !ios)) return null;
  return (
    <Card className="space-y-2">
      <h2 className="font-medium">{t('x.pwa.title')}</h2>
      <p className="text-sm text-muted">{t('x.pwa.body')}</p>
      {canPrompt && <Button onClick={() => void install()}>{t('x.pwa.install')}</Button>}
      {ios && <p className="text-sm">{t('x.pwa.ios')}</p>}
    </Card>
  );
}
