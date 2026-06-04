'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminLeaveType } from '@shared/types/admin-leave-type';
import type {
  AdminLeaveTypeCreateInput,
  AdminLeaveTypeUpdateInput,
} from '@shared/schemas/admin-leave-types';

const KEY = 'admin-leave-types';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useLeaveTypes(params: ListParams = {}) {
  return useQuery<Paginated<AdminLeaveType>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminLeaveType>('/admin/hr/leave-types', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminLeaveTypeCreateInput) =>
      api.post<AdminLeaveType>('/admin/hr/leave-types', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminLeaveTypeUpdateInput }) =>
      api.put<AdminLeaveType>(`/admin/hr/leave-types/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/hr/leave-types/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
