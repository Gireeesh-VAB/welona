'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminDesignation } from '@shared/types/admin-designation';
import type {
  AdminDesignationCreateInput,
  AdminDesignationUpdateInput,
} from '@shared/schemas/admin-designations';

const KEY = 'admin-designations';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useAdminDesignations(params: ListParams = {}) {
  return useQuery<Paginated<AdminDesignation>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminDesignation>('/admin/designations', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateAdminDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminDesignationCreateInput) =>
      api.post<AdminDesignation>('/admin/designations', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminDesignationUpdateInput }) =>
      api.put<AdminDesignation>(`/admin/designations/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/designations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
