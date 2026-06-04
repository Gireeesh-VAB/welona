'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type {
  AdminInventoryMovement,
  AdminInventoryStockRow,
} from '@shared/types/admin-inventory';
import type {
  AdminInventoryMovementCreateInput,
  AdminInventoryOpeningStockInput,
} from '@shared/schemas/admin-inventory';

const STOCK_KEY = 'admin-inventory-stock';
const MOVE_KEY = 'admin-inventory-movements';

interface StockParams {
  branchId: string | null;
  warehouseId?: string;
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useInventoryStock(params: StockParams) {
  return useQuery<Paginated<AdminInventoryStockRow>>({
    queryKey: [STOCK_KEY, params],
    enabled: Boolean(params.branchId),
    queryFn: () =>
      apiList<AdminInventoryStockRow>('/admin/inventory/stock', {
        query: {
          branchId: params.branchId!,
          warehouseId: params.warehouseId,
          search: params.search,
          lowStockOnly: params.lowStockOnly,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

interface MoveListParams {
  branchId?: string;
  productId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function useInventoryMovements(params: MoveListParams = {}) {
  return useQuery<Paginated<AdminInventoryMovement>>({
    queryKey: [MOVE_KEY, params],
    queryFn: () =>
      apiList<AdminInventoryMovement>('/admin/inventory/movements', {
        query: {
          branchId: params.branchId,
          productId: params.productId,
          type: params.type,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [STOCK_KEY] });
  qc.invalidateQueries({ queryKey: [MOVE_KEY] });
}

export function useCreateInventoryMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminInventoryMovementCreateInput) =>
      api.post<AdminInventoryMovement>('/admin/inventory/movements', body),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useSetOpeningStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminInventoryOpeningStockInput) =>
      api.post<{ entries: number; branchId: string }>(
        '/admin/inventory/opening-stock',
        body,
      ),
    onSuccess: () => invalidateAll(qc),
  });
}
