'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminSupplier } from '@shared/types/admin-supplier';
import type {
  AdminSupplierCreateInput,
  AdminSupplierUpdateInput,
} from '@shared/schemas/admin-suppliers';

const KEY = 'admin-suppliers';

interface ListParams {
  search?: string;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export function useSuppliers(params: ListParams = {}) {
  return useQuery<Paginated<AdminSupplier>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminSupplier>('/admin/suppliers', {
        query: {
          search: params.search,
          active: params.active,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminSupplierCreateInput) =>
      api.post<AdminSupplier>('/admin/suppliers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminSupplierUpdateInput }) =>
      api.put<AdminSupplier>(`/admin/suppliers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/suppliers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
