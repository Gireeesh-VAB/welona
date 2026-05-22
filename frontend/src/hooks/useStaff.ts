'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { BranchOption, Employee, RoleOption } from '@shared/types/staff';

/** Every employee in the organisation. */
export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => api.get<Employee[]>('/staff'),
  });
}

/** Roles available for staff assignment. */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<RoleOption[]>('/roles'),
    staleTime: 5 * 60 * 1000,
  });
}

/** Active branches available for staff assignment. */
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<BranchOption[]>('/branches'),
    staleTime: 5 * 60 * 1000,
  });
}

/** Add a new employee (creates their sign-in account). */
export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Employee>('/staff', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

/** Update an employee — account status and/or HR details. */
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<{ id: string; status: string }>(`/staff/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
