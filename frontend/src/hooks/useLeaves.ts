'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type {
  AdminLeaveApplication,
  AdminLeaveBalanceReport,
} from '@shared/types/admin-leave';
import type {
  AdminLeaveApplicationCreateInput,
  AdminLeaveDecisionInput,
} from '@shared/schemas/admin-leaves';

const KEY = 'admin-leaves';
const BAL_KEY = 'admin-leave-balance';

interface ListParams {
  employeeId?: string;
  leaveTypeId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function useLeaves(params: ListParams = {}) {
  return useQuery<Paginated<AdminLeaveApplication>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminLeaveApplication>('/admin/hr/leaves', {
        query: {
          employeeId: params.employeeId,
          leaveTypeId: params.leaveTypeId,
          status: params.status,
          from: params.from,
          to: params.to,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function useLeaveBalance(employeeId: string | null, year?: number) {
  return useQuery<AdminLeaveBalanceReport>({
    queryKey: [BAL_KEY, { employeeId, year }],
    enabled: Boolean(employeeId),
    queryFn: () =>
      api.get<AdminLeaveBalanceReport>('/admin/hr/leaves/balance', {
        employeeId: employeeId!,
        year,
      }),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: [BAL_KEY] });
  qc.invalidateQueries({ queryKey: ['hr-dashboard'] });
  qc.invalidateQueries({ queryKey: ['admin-employee-profile'] });
  qc.invalidateQueries({ queryKey: ['admin-attendance'] });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminLeaveApplicationCreateInput) =>
      api.post<AdminLeaveApplication>('/admin/hr/leaves', body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminLeaveDecisionInput }) =>
      api.post<AdminLeaveApplication>(`/admin/hr/leaves/${id}/approve`, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminLeaveDecisionInput }) =>
      api.post<AdminLeaveApplication>(`/admin/hr/leaves/${id}/reject`, body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<AdminLeaveApplication>(`/admin/hr/leaves/${id}/cancel`),
    onSuccess: () => invalidateAll(qc),
  });
}
