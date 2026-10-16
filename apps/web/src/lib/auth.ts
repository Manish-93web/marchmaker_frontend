import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JourneyState, TrackerStatus } from '@marchmaker/shared';
import { api, ApiRequestError } from './api';

export interface Me {
  id: string;
  email: string | null;
  emailVerified: boolean;
  phoneMasked: string | null;
  phoneVerified: boolean;
  firstName: string;
  gender: string;
  roles: string[];
  status: string;
  journeyState: JourneyState;
  tracker: TrackerStatus;
  plan: { planCode: string; status: string };
  creditBalance: number;
  referralCode: string;
  locale: string;
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  mfa: boolean;
  sessionId: string;
  pendingLegal: { type: string; version: string; title: string }[];
  consents: Record<string, { granted: boolean; documentVersion?: string }>;
  deletionScheduledFor: string | null;
}

export const ME_KEY = ['me'] as const;

/** `null` data means signed out; other errors surface normally. */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api<Me>('/auth/me');
      } catch (e) {
        if (e instanceof ApiRequestError && e.status === 401) return null;
        throw e;
      }
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => qc.setQueryData(ME_KEY, null),
  });
}
