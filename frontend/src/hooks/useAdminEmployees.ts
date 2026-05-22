'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminEmployee } from '@shared/types/admin-employee';
import type {
  AdminEmployeeCreateInput,
  AdminEmployeeUpdateInput,
} from '@shared/schemas/admin-employees';

const KEY = 'admin-employees';

interface ListParams {
  search?: string;
  branchId?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export function useAdminEmployees(params: ListParams = {}) {
  return useQuery<Paginated<AdminEmployee>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminEmployee>('/admin/employees', {
        query: {
          search: params.search,
          branchId: params.branchId,
          departmentId: params.departmentId,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminEmployeeCreateInput) =>
      api.post<AdminEmployee>('/admin/employees', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminEmployeeUpdateInput }) =>
      api.put<AdminEmployee>(`/admin/employees/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
