'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminReceiptCancellation } from '@/types/admin-receipt-cancellation';
import type {
  AdminReceiptCancellationCreateInput,
  AdminReceiptCancellationUpdateInput,
} from '@/lib/admin-receipt-cancellations';

const KEY = 'admin-receipt-cancellations';

interface ListParams {
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export function useAdminReceiptCancellations(params: ListParams = {}) {
  return useQuery<Paginated<AdminReceiptCancellation>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminReceiptCancellation>('/admin/cancellation/receipt', {
        query: {
          search: params.search,
          branchId: params.branchId,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminReceiptCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminReceiptCancellationCreateInput) =>
      api.post<AdminReceiptCancellation>('/admin/cancellation/receipt', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminReceiptCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AdminReceiptCancellationUpdateInput;
    }) => api.put<AdminReceiptCancellation>(`/admin/cancellation/receipt/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminReceiptCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cancellation/receipt/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
