'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminBranchCatalogInput } from '@shared/schemas/admin-branch-catalog';

const KEY = 'admin-branch-catalog';

/** The product + service ids a branch currently carries. */
export function useBranchCatalog(branchId: string | null) {
  return useQuery<AdminBranchCatalogInput>({
    queryKey: [KEY, branchId],
    enabled: Boolean(branchId),
    queryFn: () => api.get<AdminBranchCatalogInput>(`/admin/branches/${branchId}/catalog`),
  });
}

/** Replace a branch's whole product + service assignment. */
export function useSetBranchCatalog(branchId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminBranchCatalogInput) =>
      api.put<AdminBranchCatalogInput>(`/admin/branches/${branchId}/catalog`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, branchId] });
      // Inventory stock depends on the branch's product assignment.
      qc.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
    },
  });
}
