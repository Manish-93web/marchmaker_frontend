import { useEffect, useState } from 'react';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as { standalone?: boolean }).standalone === true);

export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Registers the service worker. It only provides push and an offline page; it never caches app data. */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        const announce = () => {
          if (reg.waiting && navigator.serviceWorker.controller) notifyUpdate(() => reg.waiting?.postMessage({ type: 'SKIP_WAITING' }));
        };
        announce();
        reg.addEventListener('updatefound', () => {
          const w = reg.installing;
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed') announce();
          });
        });
        // Check for a newer version when the app is opened again after a while.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

type UpdateHandler = (apply: () => void) => void;
let handler: UpdateHandler | null = null;
/** The UI registers how to ask the person; until then an available update waits quietly. */
export function onUpdateAvailable(h: UpdateHandler) {
  handler = h;
}
function notifyUpdate(apply: () => void) {
  handler?.(apply);
}

/** Captures the browser's install prompt so the app can offer it at a calm moment. */
export function useInstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return {
    installed,
    canPrompt: event !== null,
    ios: isIos() && !installed,
    install: async () => {
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      setEvent(null);
    },
  };
}
