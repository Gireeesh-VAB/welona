'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type { AdminRole } from '@shared/types/admin-role';
import type { AdminRoleCreateInput, AdminRoleUpdateInput } from '@shared/schemas/admin-roles';

const KEY = 'admin-roles';

export function useAdminRoles(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => apiList<AdminRole>('/admin/roles', { query: { limit: 200, ...params } }),
    staleTime: 60_000,
  });
}

export function useCreateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminRoleCreateInput) => api.post<AdminRole>('/admin/roles', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminRoleUpdateInput }) =>
      api.put<AdminRole>(`/admin/roles/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
