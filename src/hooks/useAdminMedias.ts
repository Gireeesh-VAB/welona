'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminMedia } from '@/types/admin-media';
import type {
  AdminMediaCreateInput,
  AdminMediaUpdateInput,
} from '@/lib/admin-medias';

const KEY = 'admin-medias';

interface ListParams {
  search?: string;
  zoneId?: string;
  page?: number;
  limit?: number;
}

export function useAdminMedias(params: ListParams = {}) {
  return useQuery<Paginated<AdminMedia>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminMedia>('/admin/medias', {
        query: {
          search: params.search,
          zoneId: params.zoneId,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminMediaCreateInput) =>
      api.post<AdminMedia>('/admin/medias', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminMediaUpdateInput }) =>
      api.put<AdminMedia>(`/admin/medias/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/medias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
