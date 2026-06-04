'use client';

import { useQuery } from '@tanstack/react-query';
import { apiList, type Paginated } from '@/lib/api-client';
import type { AdminAuditLog } from '@shared/types/admin-audit-log';

const KEY = 'admin-audit-logs';

interface Params {
  entity?: string;
  actorType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useAuditLogs(params: Params = {}) {
  return useQuery<Paginated<AdminAuditLog>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminAuditLog>('/admin/audit-logs', {
        query: {
          entity: params.entity,
          actorType: params.actorType,
          search: params.search,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}
