'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminService } from '@shared/types/admin-service';
import type { AdminProduct } from '@shared/types/admin-product';
import type {
  AdminServiceCreateInput,
  AdminServiceUpdateInput,
} from '@shared/schemas/admin-services';

const KEY = 'admin-services';

interface ListParams {
  search?: string;
  categoryId?: string;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export function useAdminServices(params: ListParams = {}) {
  return useQuery<Paginated<AdminService>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminService>('/admin/services', {
        query: {
          search: params.search,
          categoryId: params.categoryId,
          active: params.active,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminServiceCreateInput) =>
      api.post<AdminService>('/admin/services', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminServiceUpdateInput }) =>
      api.put<AdminService>(`/admin/services/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
}

/** Fetch all active products as a flat list for the inventory-item picker. */
export function useAdminProductOptions() {
  return useQuery<ProductOption[]>({
    queryKey: ['admin-product-options'],
    queryFn: async () => {
      const data = await apiList<AdminProduct>('/admin/products', {
        query: { isActive: true, limit: 200 },
      });
      return data.items.map((p) => ({ id: p.id, name: p.name, sku: p.sku, uom: p.uom }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
