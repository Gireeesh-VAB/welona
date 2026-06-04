'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminStockTransfer } from '@shared/types/admin-stock-transfer';
import type {
  AdminStockTransferCreateInput,
  AdminStockTransferActionInput,
} from '@shared/schemas/admin-stock-transfers';
import type { StockTransferStatus } from '@shared/enums';

const KEY = 'admin-stock-transfers';

interface ListParams {
  branchId?: string;
  status?: StockTransferStatus;
  page?: number;
  limit?: number;
}

export function useStockTransfers(params: ListParams = {}) {
  return useQuery<Paginated<AdminStockTransfer>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminStockTransfer>('/admin/stock-transfers', {
        query: { branchId: params.branchId, status: params.status, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminStockTransferCreateInput) =>
      api.post<AdminStockTransfer>('/admin/stock-transfers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

/** Dispatch / receive / cancel a transfer. */
export function useStockTransferAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string } & AdminStockTransferActionInput) =>
      api.put<AdminStockTransfer>(`/admin/stock-transfers/${id}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
    },
  });
}

export function useDeleteStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/stock-transfers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
