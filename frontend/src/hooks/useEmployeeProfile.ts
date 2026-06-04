'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminEmployeeProfile } from '@shared/types/admin-employee-profile';

const KEY = 'admin-employee-profile';

export function useEmployeeProfile(id: string | null) {
  return useQuery<AdminEmployeeProfile>({
    queryKey: [KEY, id],
    enabled: Boolean(id),
    queryFn: () => api.get<AdminEmployeeProfile>(`/admin/hr/employees/${id}/profile`),
  });
}
