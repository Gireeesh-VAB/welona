'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminProduct } from '@shared/types/admin-product';
import type {
  AdminProductCreateInput,
  AdminProductUpdateInput,
} from '@shared/schemas/admin-products';

const KEY = 'admin-products';

interface ListParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export function useProducts(params: ListParams = {}) {
  return useQuery<Paginated<AdminProduct>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminProduct>('/admin/products', {
        query: {
          search: params.search,
          categoryId: params.categoryId,
          isActive: params.isActive,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminProductCreateInput) =>
      api.post<AdminProduct>('/admin/products', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminProductUpdateInput }) =>
      api.put<AdminProduct>(`/admin/products/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
