'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type {
  AdminPurchaseOrder,
  AdminGoodsReceipt,
} from '@shared/types/admin-purchase-order';
import type {
  AdminPurchaseOrderCreateInput,
  AdminPurchaseOrderUpdateInput,
  AdminGoodsReceiptCreateInput,
} from '@shared/schemas/admin-purchase-orders';
import type { PurchaseOrderStatus } from '@shared/enums';

const PO_KEY = 'admin-purchase-orders';
const GRN_KEY = 'admin-goods-receipts';

interface POListParams {
  search?: string;
  branchId?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  page?: number;
  limit?: number;
}

export function usePurchaseOrders(params: POListParams = {}) {
  return useQuery<Paginated<AdminPurchaseOrder>>({
    queryKey: [PO_KEY, params],
    queryFn: () =>
      apiList<AdminPurchaseOrder>('/admin/purchase-orders', {
        query: {
          search: params.search,
          branchId: params.branchId,
          supplierId: params.supplierId,
          status: params.status,
          page: params.page,
          limit: params.limit,
        },
      }),
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery<AdminPurchaseOrder>({
    queryKey: [PO_KEY, 'detail', id],
    enabled: Boolean(id),
    queryFn: () => api.get<AdminPurchaseOrder>(`/admin/purchase-orders/${id}`),
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminPurchaseOrderCreateInput) =>
      api.post<AdminPurchaseOrder>('/admin/purchase-orders', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PO_KEY] }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminPurchaseOrderUpdateInput }) =>
      api.put<AdminPurchaseOrder>(`/admin/purchase-orders/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PO_KEY] }),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/purchase-orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PO_KEY] }),
  });
}

export function useGoodsReceipts(params: { branchId?: string; poId?: string; page?: number; limit?: number } = {}) {
  return useQuery<Paginated<AdminGoodsReceipt>>({
    queryKey: [GRN_KEY, params],
    queryFn: () =>
      apiList<AdminGoodsReceipt>('/admin/goods-receipts', {
        query: { branchId: params.branchId, poId: params.poId, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminGoodsReceiptCreateInput) =>
      api.post<AdminGoodsReceipt>('/admin/goods-receipts', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [GRN_KEY] });
      qc.invalidateQueries({ queryKey: [PO_KEY] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
    },
  });
}
