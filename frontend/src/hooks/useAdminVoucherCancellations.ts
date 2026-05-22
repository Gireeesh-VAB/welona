'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminVoucherCancellation } from '@shared/types/admin-voucher-cancellation';
import type {
  AdminVoucherCancellationCreateInput,
  AdminVoucherCancellationUpdateInput,
} from '@shared/schemas/admin-voucher-cancellations';

const KEY = 'admin-voucher-cancellations';

interface ListParams {
  search?: string;
  branchId?: string;
  expenseType?: string;
  page?: number;
  limit?: number;
}

export function useAdminVoucherCancellations(params: ListParams = {}) {
  return useQuery<Paginated<AdminVoucherCancellation>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminVoucherCancellation>('/admin/cancellation/voucher', {
        query: {
          search: params.search,
          branchId: params.branchId,
          expenseType: params.expenseType,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminVoucherCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminVoucherCancellationCreateInput) =>
      api.post<AdminVoucherCancellation>('/admin/cancellation/voucher', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminVoucherCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AdminVoucherCancellationUpdateInput;
    }) => api.put<AdminVoucherCancellation>(`/admin/cancellation/voucher/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminVoucherCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cancellation/voucher/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
