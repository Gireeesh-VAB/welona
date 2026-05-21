'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminLedger } from '@/types/admin-ledger';
import type {
  AdminLedgerCreateInput,
  AdminLedgerUpdateInput,
  LedgerGroup,
} from '@/lib/admin-ledgers';

const KEY = 'admin-ledgers';

interface ListParams {
  search?: string;
  group?: LedgerGroup;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export function useAdminLedgers(params: ListParams = {}) {
  return useQuery<Paginated<AdminLedger>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminLedger>('/admin/ledgers', {
        query: {
          search: params.search,
          group: params.group,
          active: params.active,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminLedgerCreateInput) =>
      api.post<AdminLedger>('/admin/ledgers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminLedgerUpdateInput }) =>
      api.put<AdminLedger>(`/admin/ledgers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminLedger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/ledgers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
