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
    void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
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
