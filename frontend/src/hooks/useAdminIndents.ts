'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { StockIndent } from '@shared/types/stock-indent';
import type { StockIndentCreateInput, StockIndentActionInput } from '@shared/schemas/admin-indents';

const KEY = 'admin-indents';

interface IndentListParams {
  branchId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useAdminIndents(params: IndentListParams = {}) {
  return useQuery<Paginated<StockIndent>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<StockIndent>('/admin/indents', {
        query: {
          branchId: params.branchId,
          status: params.status,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      }),
  });
}

export function useCreateAdminIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StockIndentCreateInput) => api.post<StockIndent>('/admin/indents', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAdminIndentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & StockIndentActionInput) =>
      api.patch<StockIndent>(`/admin/indents/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
    },
  });
}

export interface WarehouseEntry {
  warehouseId: string;
  warehouseName: string;
  branchId: string;
  branchName: string;
  branchAddress: string | null;
  branchCity: string | null;
  branchPhone: string | null;
  quantity: number;
  canFulfill: boolean;
}

export interface WarehouseStockItem {
  itemId: string;
  productId: string;
  productName: string;
  productSku: string;
  productUom: string;
  requestedQty: number;
  approvedQty: number | null;
  neededQty: number;
  warehouses: WarehouseEntry[];
  recommendation: (WarehouseEntry & { availableQty: number; canFullyFulfill: boolean }) | null;
}

export interface PickupGroup {
  warehouseId: string;
  warehouseName: string;
  branchName: string;
  branchAddress: string | null;
  branchCity: string | null;
  branchPhone: string | null;
  items: { productName: string; productSku: string; productUom: string; pickQty: number }[];
}

export interface WarehouseAvailabilityResult {
  indentId: string;
  indentNumber: string | null;
  destinationBranch: string | null;
  status: string;
  items: WarehouseStockItem[];
  pickupGroups: PickupGroup[];
}

export function useWarehouseAvailability(indentId: string | null) {
  return useQuery<WarehouseAvailabilityResult>({
    queryKey: ['indent-warehouse-availability', indentId],
    queryFn: () => api.get<WarehouseAvailabilityResult>(`/admin/indents/${indentId}/warehouse-availability`),
    enabled: !!indentId,
    staleTime: 10_000,
  });
}

/** Polls pending indent count every 30 s — used by the notification bell. */
export function useAdminPendingIndentCount(enabled = true) {
  return useQuery<Paginated<StockIndent>>({
    queryKey: [KEY, { status: 'pending', page: 1, limit: 5 }],
    queryFn: () =>
      apiList<StockIndent>('/admin/indents', {
        query: { status: 'pending', page: 1, limit: 5 },
      }),
    staleTime: 0,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: enabled,
  });
}
