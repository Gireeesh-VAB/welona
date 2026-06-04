'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminHoliday } from '@shared/types/admin-holiday';
import type {
  AdminHolidayCreateInput,
  AdminHolidayUpdateInput,
} from '@shared/schemas/admin-holidays';

const KEY = 'admin-holidays';

interface ListParams {
  year?: number;
  type?: string;
  region?: string;
  page?: number;
  limit?: number;
}

export function useHolidays(params: ListParams = {}) {
  return useQuery<Paginated<AdminHoliday>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminHoliday>('/admin/hr/holidays', {
        query: {
          year: params.year,
          type: params.type,
          region: params.region,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminHolidayCreateInput) =>
      api.post<AdminHoliday>('/admin/hr/holidays', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
    },
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminHolidayUpdateInput }) =>
      api.put<AdminHoliday>(`/admin/hr/holidays/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/hr/holidays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
    },
  });
}
