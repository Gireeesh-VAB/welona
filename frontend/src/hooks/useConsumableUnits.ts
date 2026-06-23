import { useQuery } from '@tanstack/react-query';
import { apiList, type Paginated } from '@/lib/api-client';
import type { ConsumableUnitRow } from '@shared/types/admin-service-inventory';

interface Params {
  branchId: string;
  productId?: string;
  status?: 'sealed' | 'open' | 'exhausted' | 'discarded' | 'active';
  page?: number;
  limit?: number;
}

export function useConsumableUnits(params: Params): ReturnType<typeof useQuery<Paginated<ConsumableUnitRow>>> {
  const { branchId, productId, status, page, limit } = params;
  return useQuery<Paginated<ConsumableUnitRow>>({
    queryKey: ['consumable-units', branchId, productId, status, page, limit],
    queryFn: () =>
      apiList<ConsumableUnitRow>('/admin/inventory/consumable-units', {
        query: {
          branchId,
          ...(productId ? { productId } : {}),
          ...(status ? { status } : {}),
          ...(page ? { page } : {}),
          ...(limit ? { limit } : {}),
        },
      }),
    enabled: !!branchId,
    staleTime: 30_000,
  });
}
