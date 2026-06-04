'use client';

import { useQuery } from '@tanstack/react-query';
import { apiList, type Paginated } from '@/lib/api-client';
import type { AdminBatchRow } from '@shared/types/admin-batch';

const KEY = 'admin-batches';

interface Params {
  branchId?: string;
  productId?: string;
  search?: string;
  inStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useBatches(params: Params = {}) {
  return useQuery<Paginated<AdminBatchRow>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminBatchRow>('/admin/inventory/batches', {
        query: {
          branchId: params.branchId,
          productId: params.productId,
          search: params.search,
          inStockOnly: params.inStockOnly,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}
