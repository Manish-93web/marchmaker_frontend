import { useQuery } from '@tanstack/react-query';
import type { ProfileStep } from '@marchmaker/shared';
import { api } from './api';

export interface ReviewNote {
  at: string;
  message: string;
  stepKeys?: string[];
}

export interface ProfileDoc {
  version: number;
  status: 'draft' | 'submitted' | 'changes_requested' | 'approved';
  currentStep: ProfileStep;
  data: Record<string, Record<string, unknown>>;
  steps: Record<ProfileStep, boolean>;
  reviewNotes: ReviewNote[];
  submittedAt: string | null;
}

export const PROFILE_KEY = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => api<ProfileDoc>('/profile'),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export interface PhotoRow {
  id: string;
  status: 'processing' | 'pending' | 'approved' | 'rejected';
  isPrimary: boolean;
  order: number;
  rejectionReason: string | null;
  sm: string | null;
  md: string | null;
}

export const PHOTOS_KEY = ['photos'] as const;
