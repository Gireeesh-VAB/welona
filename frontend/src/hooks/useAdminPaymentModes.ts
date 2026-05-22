'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminPaymentMode } from '@shared/types/admin-payment-mode';
import type {
  AdminPaymentModeCreateInput,
  AdminPaymentModeUpdateInput,
} from '@shared/schemas/admin-payment-modes';

const KEY = 'admin-payment-modes';

interface ListParams {
  search?: string;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export function useAdminPaymentModes(params: ListParams = {}) {
  return useQuery<Paginated<AdminPaymentMode>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminPaymentMode>('/admin/payment-modes', {
        query: {
          search: params.search,
          active: params.active,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminPaymentMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminPaymentModeCreateInput) =>
      api.post<AdminPaymentMode>('/admin/payment-modes', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminPaymentMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminPaymentModeUpdateInput }) =>
      api.put<AdminPaymentMode>(`/admin/payment-modes/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminPaymentMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/payment-modes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
