'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminTax } from '@/types/admin-tax';
import type {
  AdminTaxCreateInput,
  AdminTaxUpdateInput,
} from '@/lib/admin-taxes';

const KEY = 'admin-taxes';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useAdminTaxes(params: ListParams = {}) {
  return useQuery<Paginated<AdminTax>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminTax>('/admin/taxes', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateAdminTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminTaxCreateInput) => api.post<AdminTax>('/admin/taxes', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminTaxUpdateInput }) =>
      api.put<AdminTax>(`/admin/taxes/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/taxes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
