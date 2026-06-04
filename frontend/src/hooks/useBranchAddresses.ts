'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminBranchAddress } from '@shared/types/admin-branch-address';
import type {
  AdminBranchAddressCreateInput,
  AdminBranchAddressUpdateInput,
} from '@shared/schemas/admin-branch-addresses';

const KEY = 'admin-branch-addresses';

export function useBranchAddresses(branchId: string | null) {
  return useQuery<AdminBranchAddress[]>({
    queryKey: [KEY, branchId],
    enabled: Boolean(branchId),
    queryFn: () => api.get<AdminBranchAddress[]>(`/admin/branches/${branchId}/addresses`),
  });
}

export function useCreateBranchAddress(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminBranchAddressCreateInput) =>
      api.post<AdminBranchAddress>(`/admin/branches/${branchId}/addresses`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, branchId] });
      qc.invalidateQueries({ queryKey: ['admin-branches'] });
    },
  });
}

export function useUpdateBranchAddress(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminBranchAddressUpdateInput }) =>
      api.put<AdminBranchAddress>(`/admin/branches/${branchId}/addresses/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, branchId] });
      qc.invalidateQueries({ queryKey: ['admin-branches'] });
    },
  });
}

export function useDeleteBranchAddress(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/branches/${branchId}/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, branchId] });
      qc.invalidateQueries({ queryKey: ['admin-branches'] });
    },
  });
}
