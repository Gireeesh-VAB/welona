'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdminInventoryAlerts } from '@shared/types/admin-inventory-alert';

const KEY = 'admin-inventory-alerts';

export function useInventoryAlerts(params: { branchId?: string } = {}) {
  return useQuery<AdminInventoryAlerts>({
    queryKey: [KEY, params],
    queryFn: () => api.get<AdminInventoryAlerts>('/admin/inventory/alerts', { branchId: params.branchId }),
  });
}
