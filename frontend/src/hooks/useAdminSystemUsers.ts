'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminSystemUser } from '@shared/types/admin-system-user';
import type {
  AdminSystemUserCreateInput,
  AdminSystemUserUpdateInput,
} from '@shared/schemas/admin-system-users';

const KEY = 'admin-system-users';

interface ListParams {
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export function useAdminSystemUsers(params: ListParams = {}) {
  return useQuery<Paginated<AdminSystemUser>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminSystemUser>('/admin/system-users', {
        query: {
          search: params.search,
          branchId: params.branchId,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminSystemUserCreateInput) =>
      api.post<AdminSystemUser>('/admin/system-users', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminSystemUserUpdateInput }) =>
      api.put<AdminSystemUser>(`/admin/system-users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminSystemUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/system-users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
