'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminWarehouse } from '@shared/types/admin-warehouse';
import type {
  AdminWarehouseCreateInput,
  AdminWarehouseUpdateInput,
} from '@shared/schemas/admin-warehouses';

const KEY = 'admin-warehouses';

interface ListParams {
  branchId?: string;
  search?: string;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function useWarehouses(params: ListParams = {}) {
  const { enabled = true, ...query } = params;
  return useQuery<Paginated<AdminWarehouse>>({
    queryKey: [KEY, query],
    enabled,
    queryFn: () =>
      apiList<AdminWarehouse>('/admin/warehouses', {
        query: {
          branchId: query.branchId,
          search: query.search,
          active: query.active,
          page: query.page,
          limit: query.limit,
        },
      }),
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminWarehouseCreateInput) => api.post<AdminWarehouse>('/admin/warehouses', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminWarehouseUpdateInput }) =>
      api.put<AdminWarehouse>(`/admin/warehouses/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/warehouses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
