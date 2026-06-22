'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { StockIndent } from '@shared/types/stock-indent';
import type { StockIndentCreateInput, StockIndentActionInput } from '@shared/schemas/admin-indents';

const KEY = 'admin-indents';

interface IndentListParams {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useAdminIndents(params: IndentListParams = {}) {
  return useQuery<Paginated<StockIndent>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<StockIndent>('/admin/indents', {
        query: {
          branchId: params.branchId,
          status: params.status,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      }),
  });
}

export function useCreateAdminIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StockIndentCreateInput) => api.post<StockIndent>('/admin/indents', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAdminIndentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & StockIndentActionInput) =>
      api.patch<StockIndent>(`/admin/indents/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
    },
  });
}

/** Polls pending indent count every 30 s — used by the notification bell. */
export function useAdminPendingIndentCount(enabled = true) {
  return useQuery<Paginated<StockIndent>>({
    queryKey: [KEY, { status: 'pending', page: 1, limit: 5 }],
    queryFn: () =>
      apiList<StockIndent>('/admin/indents', {
        query: { status: 'pending', page: 1, limit: 5 },
      }),
    staleTime: 0,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: enabled,
  });
}
