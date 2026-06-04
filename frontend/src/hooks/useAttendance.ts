'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminAttendance } from '@shared/types/admin-attendance';
import type {
  AdminAttendanceUpsertInput,
  AdminAttendanceBulkInput,
} from '@shared/schemas/admin-attendance';

const KEY = 'admin-attendance';

interface ListParams {
  employeeId?: string;
  branchId?: string;
  from?: string;
  to?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useAttendance(params: ListParams = {}) {
  return useQuery<Paginated<AdminAttendance>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminAttendance>('/admin/hr/attendance', {
        query: {
          employeeId: params.employeeId,
          branchId: params.branchId,
          from: params.from,
          to: params.to,
          status: params.status,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminAttendanceUpsertInput) =>
      api.post<AdminAttendance>('/admin/hr/attendance', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin-employee-profile'] });
    },
  });
}

export function useBulkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminAttendanceBulkInput) =>
      api.post<{ marked: number; date: string }>('/admin/hr/attendance/bulk', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin-employee-profile'] });
    },
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/hr/attendance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['admin-employee-profile'] });
    },
  });
}
