'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminPackageCancellation } from '@shared/types/admin-package-cancellation';
import type {
  AdminPackageCancellationCreateInput,
  AdminPackageCancellationUpdateInput,
} from '@shared/schemas/admin-package-cancellations';

const KEY = 'admin-package-cancellations';

interface ListParams {
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export function useAdminPackageCancellations(params: ListParams = {}) {
  return useQuery<Paginated<AdminPackageCancellation>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminPackageCancellation>('/admin/cancellation/package', {
        query: {
          search: params.search,
          branchId: params.branchId,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateAdminPackageCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminPackageCancellationCreateInput) =>
      api.post<AdminPackageCancellation>('/admin/cancellation/package', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminPackageCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AdminPackageCancellationUpdateInput;
    }) =>
      api.put<AdminPackageCancellation>(`/admin/cancellation/package/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminPackageCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cancellation/package/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
