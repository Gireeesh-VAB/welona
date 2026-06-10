'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type { AdminState } from '@shared/types/admin-state';
import type { AdminStateCreateInput } from '@shared/schemas/admin-states';

export function useAdminStates(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['admin-states', params],
    queryFn: () => apiList<AdminState>('/admin/states', { query: params }),
    staleTime: 60_000,
  });
}

export function useCreateAdminState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminStateCreateInput) => api.post<AdminState>('/admin/states', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-states'] }),
  });
}

export function useUpdateAdminState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminStateCreateInput> }) =>
      api.put<AdminState>(`/admin/states/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-states'] }),
  });
}

export function useDeleteAdminState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/states/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-states'] }),
  });
}
