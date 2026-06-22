'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { ProcurementRFQ } from '@shared/types/admin-rfq';

const KEY = 'admin-rfqs';

interface RFQParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useRFQs(params: RFQParams = {}) {
  return useQuery<Paginated<ProcurementRFQ>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<ProcurementRFQ>('/admin/procurement/rfq', {
        query: {
          status: params.status,
          search: params.search,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
        },
      }),
    staleTime: 30_000,
  });
}

export function useRFQ(id: string) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => api.get<ProcurementRFQ>(`/admin/procurement/rfq/${id}`),
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    enabled: !!id,
  });
}

export function useCreateRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      items: { productId: string; requiredQty: number }[];
      reason?: string;
      notes?: string;
      indentId?: string;
    }) => api.post<ProcurementRFQ>('/admin/procurement/rfq', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateRFQ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { status?: string; notes?: string } }) =>
      api.patch<ProcurementRFQ>(`/admin/procurement/rfq/${id}`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, 'detail', vars.id] });
    },
  });
}

export function useUpsertSupplierQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      body,
    }: {
      rfqId: string;
      body: {
        supplierId: string;
        validUntil?: string;
        notes?: string;
        items: {
          productId: string;
          unitPrice: number;
          deliveryDays: number;
          moq?: number;
          notes?: string;
        }[];
      };
    }) => api.post<ProcurementRFQ>(`/admin/procurement/rfq/${rfqId}/quotes`, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, 'detail', vars.rfqId] });
    },
  });
}
