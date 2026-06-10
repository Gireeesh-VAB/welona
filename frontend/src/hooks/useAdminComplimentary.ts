'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminComplimentaryRule } from '@shared/types/admin-complimentary';
import type {
  AdminComplimentaryRuleCreateInput,
  AdminComplimentaryRuleUpdateInput,
} from '@shared/schemas/admin-complimentary';

const KEY = 'admin-complimentary';

interface ListParams {
  search?: string;
  triggerServiceId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export function useAdminComplimentaryRules(params: ListParams = {}) {
  return useQuery<Paginated<AdminComplimentaryRule>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminComplimentaryRule>('/admin/complimentary', {
        query: {
          search: params.search,
          triggerServiceId: params.triggerServiceId,
          isActive: params.isActive,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useAdminComplimentaryRule(id: string) {
  return useQuery<AdminComplimentaryRule>({
    queryKey: [KEY, id],
    queryFn: () => api.get<AdminComplimentaryRule>(`/admin/complimentary/${id}`),
    enabled: !!id,
  });
}

export function useCreateAdminComplimentaryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminComplimentaryRuleCreateInput) =>
      api.post<AdminComplimentaryRule>('/admin/complimentary', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminComplimentaryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminComplimentaryRuleUpdateInput }) =>
      api.put<AdminComplimentaryRule>(`/admin/complimentary/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminComplimentaryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/complimentary/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
