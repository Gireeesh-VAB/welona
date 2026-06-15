'use client';
import { useQuery } from '@tanstack/react-query';
import { apiList } from '@/lib/api-client';
import type { AdminState } from '@shared/types/admin-state';

/** Fetch active states for staff-side state pickers (customer create / edit). */
export function useStates(params: { search?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ['states', params],
    queryFn: () => apiList<AdminState>('/states', { query: { limit: 100, ...params } }),
    staleTime: 60_000,
  });
}
