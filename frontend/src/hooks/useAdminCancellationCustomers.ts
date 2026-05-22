'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminCancellationCustomer } from '@shared/types/admin-cancellation-customer';
import type {
  AdminCancellationCustomerCreateInput,
  AdminCancellationCustomerUpdateInput,
} from '@shared/schemas/admin-cancellation-customers';

const KEY = 'admin-cancellation-customers';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useAdminCancellationCustomers(params: ListParams = {}) {
  return useQuery<Paginated<AdminCancellationCustomer>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminCancellationCustomer>('/admin/cancellation/customers', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateAdminCancellationCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCancellationCustomerCreateInput) =>
      api.post<AdminCancellationCustomer>('/admin/cancellation/customers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminCancellationCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AdminCancellationCustomerUpdateInput;
    }) =>
      api.put<AdminCancellationCustomer>(
        `/admin/cancellation/customers/${id}`,
        body,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminCancellationCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/cancellation/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
