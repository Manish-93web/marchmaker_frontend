import { useEffect } from 'react';
import { toast } from 'sonner';
import { onUpdateAvailable } from '../lib/pwa';

/** Offers a refresh when a new version has been downloaded, instead of swapping the page under someone. */
export function UpdateToast() {
  useEffect(() => {
    onUpdateAvailable((apply) => {
      toast('A new version of Marchmaker is ready.', { id: 'sw-update', duration: Infinity, action: { label: 'Refresh', onClick: apply } });
    });
  }, []);
  return null;
}
