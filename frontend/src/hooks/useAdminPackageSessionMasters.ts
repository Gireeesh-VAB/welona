import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminPackageSessionMaster } from '@shared/types/admin-package-session-master';
import type {
  AdminPackageSessionMasterCreateInput,
  AdminPackageSessionMasterUpdateInput,
} from '@shared/schemas/admin-package-session-masters';

const KEY = 'admin-package-session-masters';
const BASE = '/admin/package-session-masters';

export function useAdminPackageSessionMasters(enabled = true) {
  return useQuery<AdminPackageSessionMaster[]>({
    queryKey: [KEY],
    queryFn:  () => api.get<AdminPackageSessionMaster[]>(`${BASE}?limit=200`),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateAdminPackageSessionMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminPackageSessionMasterCreateInput) =>
      api.post<AdminPackageSessionMaster>(BASE, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminPackageSessionMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminPackageSessionMasterUpdateInput }) =>
      api.patch<AdminPackageSessionMaster>(`${BASE}/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminPackageSessionMaster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${BASE}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
