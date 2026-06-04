'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { HrDashboardResponse } from '@shared/types/admin-hr-dashboard';

const KEY = 'hr-dashboard';

export function useHrDashboard() {
  return useQuery<HrDashboardResponse>({
    queryKey: [KEY],
    queryFn: () => api.get<HrDashboardResponse>('/admin/hr/dashboard'),
  });
}
