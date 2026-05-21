'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { Zone } from '@/types/zone';
import type { ZoneCreateInput, ZoneUpdateInput } from '@/lib/zones';

const KEY = 'admin-zones';

interface ZoneListParams {
  search?: string;
  page?: number;
  limit?: number;
}

/** List zones with pagination + search. */
export function useZones(params: ZoneListParams = {}) {
  return useQuery<Paginated<Zone>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<Zone>('/admin/zones', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

/** Create a zone. */
export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ZoneCreateInput) => api.post<Zone>('/admin/zones', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Update a zone. */
export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ZoneUpdateInput }) =>
      api.put<Zone>(`/admin/zones/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Delete a zone. */
export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/zones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
