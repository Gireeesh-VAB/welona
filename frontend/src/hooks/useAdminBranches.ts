'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminBranch } from '@shared/types/admin-branch';
import type {
  AdminBranchCreateInput,
  AdminBranchUpdateInput,
} from '@shared/schemas/admin-branches';

const KEY = 'admin-branches';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
  /** Set false to skip the query (e.g. branch sessions can't list branches). */
  enabled?: boolean;
}

export function useAdminBranches(params: ListParams = {}) {
  const { enabled = true, ...query } = params;
  return useQuery<Paginated<AdminBranch>>({
    queryKey: [KEY, query],
    enabled,
    queryFn: () =>
      apiList<AdminBranch>('/admin/branches', {
        query: { search: query.search, page: query.page, limit: query.limit },
      }),
  });
}

export function useCreateAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminBranchCreateInput) =>
      api.post<AdminBranch>('/admin/branches', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminBranchUpdateInput }) =>
      api.put<AdminBranch>(`/admin/branches/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
