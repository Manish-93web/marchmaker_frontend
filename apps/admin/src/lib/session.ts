import { useQuery } from '@tanstack/react-query';
import { api, ApiRequestError } from './api';

export interface StaffMe {
  id: string;
  email: string | null;
  firstName: string;
  roles: string[];
  permissions: string[];
  mfa: boolean;
  twoFactorEnabled: boolean;
}

export const STAFF_KEY = ['staff-me'] as const;

export async function fetchMe(): Promise<StaffMe | null> {
  try {
    return await api<StaffMe>('/auth/me');
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 401) return null;
    throw e;
  }
}

export function useStaff() {
  return useQuery({ queryKey: STAFF_KEY, queryFn: fetchMe, staleTime: 60_000, retry: false });
}

export const can = (me: StaffMe | null | undefined, perm: string) => !!me?.permissions.includes(perm);

export const errorMessage = (e: unknown) =>
  e instanceof ApiRequestError ? e.message : 'Something went wrong. Please try again.';
