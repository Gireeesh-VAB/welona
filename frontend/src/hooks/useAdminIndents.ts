'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { StockIndent } from '@shared/types/stock-indent';
import type { StockIndentUpdateInput } from '@shared/schemas/admin-indents';

const KEY = 'admin-indents';

interface IndentListParams {
  branchId?: string;
  productId?: string;
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
          productId: params.productId,
          status: params.status,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      }),
  });
}

export function useUpdateIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: StockIndentUpdateInput }) =>
      api.patch<StockIndent>(`/admin/indents/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
