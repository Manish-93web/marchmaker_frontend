import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/** Public feature switches. Everything optional is off until an admin turns it on. */
export function useFlag(key: string): boolean {
  const q = useQuery({
    queryKey: ['flags'],
    queryFn: () => api<{ flags: Record<string, boolean> }>('/flags'),
    staleTime: 60_000,
    retry: 0,
  });
  return q.data?.flags[key] === true;
}
