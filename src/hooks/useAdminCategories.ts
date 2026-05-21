'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminCategory } from '@/types/admin-category';
import type {
  AdminCategoryCreateInput,
  AdminCategoryUpdateInput,
} from '@/lib/admin-categories';

const KEY = 'admin-categories';

interface ListParams {
  search?: string;
  active?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export function useAdminCategories(params: ListParams = {}) {
  return useQuery<Paginated<AdminCategory>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminCategory>('/admin/categories', {
        query: {
          search: params.search,
          active: params.active,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

/** Fetch a single category by id (used by the dedicated edit page). */
export function useAdminCategory(id: string | undefined) {
  return useQuery<AdminCategory>({
    queryKey: [KEY, 'detail', id],
    queryFn: () => api.get<AdminCategory>(`/admin/categories/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateAdminCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCategoryCreateInput) =>
      api.post<AdminCategory>('/admin/categories', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminCategoryUpdateInput }) =>
      api.put<AdminCategory>(`/admin/categories/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
