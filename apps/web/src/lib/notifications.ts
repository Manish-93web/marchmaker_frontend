import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from './api';

export interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  url: string;
  count: number;
  read: boolean;
  at: string;
}

export interface NotificationList {
  items: NotificationItem[];
  nextCursor: string | null;
  unread: number;
}

export type Channel = 'in_app' | 'email' | 'whatsapp' | 'push';
export type Category = 'introductions' | 'messages' | 'billing' | 'verification' | 'safety' | 'product_updates';

export interface PrefsView {
  prefs: {
    channels: Record<Category, Record<Channel, boolean>>;
    quietHours: { enabled: boolean; start: string; end: string };
  };
  whatsapp: { consent: boolean; phoneVerified: boolean; planAllows: boolean; available: boolean };
  push: { devices: number; available: boolean; publicKey: string | null };
  marketingConsent: boolean;
}

export const NOTIF_KEY = ['notifications'] as const;
export const UNREAD_KEY = ['notifications', 'unread'] as const;

/**
 * Keeps the unread badge live. Uses server-sent events and falls back to a slow poll if the
 * stream cannot be opened (older proxies, offline).
 */
export function useUnread(enabled: boolean) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: UNREAD_KEY,
    enabled,
    queryFn: () => api<{ unread: number }>('/notifications/unread-count'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    const es = new EventSource('/api/v1/notifications/stream', { withCredentials: true });
    const onEvent = (e: MessageEvent<string>) => {
      try {
        const { unread } = JSON.parse(e.data) as { unread: number };
        qc.setQueryData(UNREAD_KEY, { unread });
        void qc.invalidateQueries({ queryKey: NOTIF_KEY, exact: false, predicate: (x) => x.queryKey[1] !== 'unread' });
      } catch {
        // ignore malformed frames
      }
    };
    es.addEventListener('ready', onEvent as EventListener);
    es.addEventListener('notify', onEvent as EventListener);
    return () => es.close();
  }, [enabled, qc]);

  return q.data?.unread ?? 0;
}

const b64ToUint8 = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export const pushSupported = () =>
  typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window;

/** Asks the browser for permission, registers the service worker and sends the subscription to the API. */
export async function enablePush(publicKey: string): Promise<'enabled' | 'denied'> {
  if (!pushSupported()) throw new Error('This browser does not support notifications');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) }));
  await api('/notifications/push', { method: 'POST', body: sub.toJSON() });
  return 'enabled';
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api('/notifications/push/remove', { method: 'POST', body: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  }
}
