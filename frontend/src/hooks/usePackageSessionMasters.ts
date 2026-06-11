import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PackageSessionMasterOption } from '@shared/types/admin-package-session-master';

export function usePackageSessionMasters(enabled = true) {
  return useQuery<PackageSessionMasterOption[]>({
    queryKey: ['package-session-masters'],
    queryFn:  () => api.get<PackageSessionMasterOption[]>('/package-session-masters'),
    enabled,
    staleTime: 60_000,
  });
}
