'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type {
  AdminComplimentaryRule,
  AdminBranchComplimentaryLimit,
} from '@shared/types/admin-complimentary';
import type {
  AdminComplimentaryRuleCreateInput,
  AdminComplimentaryRuleUpdateInput,
  AdminBranchComplimentaryLimitUpsertInput,
  AdminBranchComplimentaryLimitUpdateInput,
} from '@shared/schemas/admin-complimentary';

const KEY = 'admin-complimentary';
const LIMIT_KEY = 'admin-complimentary-limits';

interface ListParams {
  search?: string;
  categoryId?: string;
  branchId?: string;
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
          categoryId: params.categoryId,
          branchId: params.branchId,
          isActive: params.isActive,
          page: params.page,
          limit: params.limit,
        },
      }),
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

// ── Branch Complimentary Limits ──────────────────────────────────────────────

export function useAdminBranchComplimentaryLimits() {
  return useQuery<AdminBranchComplimentaryLimit[]>({
    queryKey: [LIMIT_KEY],
    queryFn: () => api.get<AdminBranchComplimentaryLimit[]>('/admin/complimentary-limits'),
  });
}

export function useUpsertBranchComplimentaryLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminBranchComplimentaryLimitUpsertInput) =>
      api.post<AdminBranchComplimentaryLimit>('/admin/complimentary-limits', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [LIMIT_KEY] }),
  });
}

export function useUpdateBranchComplimentaryLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminBranchComplimentaryLimitUpdateInput }) =>
      api.put<AdminBranchComplimentaryLimit>(`/admin/complimentary-limits/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [LIMIT_KEY] }),
  });
}

export function useDeleteBranchComplimentaryLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/complimentary-limits/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [LIMIT_KEY] }),
  });
}
