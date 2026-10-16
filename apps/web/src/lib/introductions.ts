import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface IntroCard {
  id: string;
  state: 'released' | 'viewed' | 'accepted_by_one' | 'mutually_accepted' | 'declined' | 'expired';
  waitingOn: 'you' | 'them' | 'none';
  myStatus: 'pending' | 'accepted' | 'declined';
  expiresAt: string;
  unlockedAt: string | null;
  endedMessage: string | null;
  why: string;
  highlights: string[];
  person: {
    firstName: string;
    age: number | null;
    city: string | null;
    state: string | null;
    profession: string | null;
    education: string | null;
    prompts: { promptId: string; answer: string }[];
    bio: string | null;
    badges: { id: boolean; selfie: boolean; phone: boolean; email: boolean };
    blurredPhoto: string | null;
  };
  credits: { available: number; held: number; needsCredit: boolean };
  firstNoteFromThem: string | null;
  myFirstNote: string | null;
  contact: { iShared: boolean; theyShared: boolean };
  voice: { iOptIn: boolean; theyOptIn: boolean } | null;
  threadId: string | null;
}

export const INTROS_KEY = ['introductions'] as const;
export const introKey = (id: string) => ['introduction', id] as const;

export function useIntroductions() {
  return useQuery({
    queryKey: INTROS_KEY,
    queryFn: () => api<{ items: IntroCard[] }>('/introductions'),
    staleTime: 15_000,
  });
}

/** "6 days", "11 hours", "40 minutes": a rounded phrase, never a ticking clock. */
export function timeLeft(iso: string, now = Date.now()): string | null {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const h = ms / 3_600_000;
  if (h >= 48) return `${Math.ceil(h / 24)} days`;
  if (h >= 1) return `${Math.floor(h)} hour${Math.floor(h) === 1 ? '' : 's'}`;
  return `${Math.max(1, Math.floor(ms / 60_000))} minutes`;
}

export function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
