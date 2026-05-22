'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminDepartment } from '@shared/types/admin-department';
import type {
  AdminDepartmentCreateInput,
  AdminDepartmentUpdateInput,
} from '@shared/schemas/admin-departments';

const KEY = 'admin-departments';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useAdminDepartments(params: ListParams = {}) {
  return useQuery<Paginated<AdminDepartment>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminDepartment>('/admin/departments', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateAdminDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminDepartmentCreateInput) =>
      api.post<AdminDepartment>('/admin/departments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminDepartmentUpdateInput }) =>
      api.put<AdminDepartment>(`/admin/departments/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/departments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
