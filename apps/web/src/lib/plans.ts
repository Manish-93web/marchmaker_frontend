import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PACKS, DEFAULT_PLANS, type PlanDefinition } from '@marchmaker/shared';
import { api } from './api';

interface PlansResponse {
  items: PlanDefinition[];
  pricesIncludeGst: boolean;
}

const FALLBACK = [...DEFAULT_PLANS, ...DEFAULT_PACKS];

/**
 * Live plans from the API. Standard prices render immediately (and in pre-rendered HTML)
 * and are replaced as soon as the live response arrives.
 */
export function usePlans() {
  const q = useQuery({
    queryKey: ['plans'],
    queryFn: () => api<PlansResponse>('/plans'),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const items = q.data?.items ?? FALLBACK;
  return {
    subscriptions: items.filter((p) => p.kind === 'subscription').sort((a, b) => a.sortOrder - b.sortOrder),
    packs: items.filter((p) => p.kind === 'pack').sort((a, b) => a.sortOrder - b.sortOrder),
    isFallback: !q.data,
    failed: q.isError,
  };
}
