'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  AdminInventoryProductReportRow,
  AdminInventoryReportSummary,
} from '@shared/types/admin-inventory-report';

const KEY = 'admin-inventory-reports';

export interface InventoryReport {
  summary: AdminInventoryReportSummary;
  products: AdminInventoryProductReportRow[];
}

interface Params {
  branchId?: string;
  days?: number;
  fastThreshold?: number;
}

export function useInventoryReports(params: Params = {}) {
  return useQuery<InventoryReport>({
    queryKey: [KEY, params],
    queryFn: () =>
      api.get<InventoryReport>('/admin/inventory/reports', {
        branchId: params.branchId,
        days: params.days,
        fastThreshold: params.fastThreshold,
      }),
  });
}
