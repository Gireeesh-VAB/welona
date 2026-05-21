'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminService } from '@/types/admin-service';
import type {
  AdminServiceCreateInput,
  AdminServiceUpdateInput,
} from '@/lib/admin-services';

const KEY = 'admin-services';

interface ListParams {
  search?: string;
  categoryId?: string;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export function useAdminServices(params: ListParams = {}) {
  return useQuery<Paginated<AdminService>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminService>('/admin/services', {
        query: {
          search: params.search,
          categoryId: params.categoryId,
          active: params.active,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminServiceCreateInput) =>
      api.post<AdminService>('/admin/services', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminServiceUpdateInput }) =>
      api.put<AdminService>(`/admin/services/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
