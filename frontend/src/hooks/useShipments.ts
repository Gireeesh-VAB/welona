'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminShipment } from '@shared/types/admin-shipment';
import type {
  AdminShipmentCreateInput,
  AdminShipmentAdvanceInput,
} from '@shared/schemas/admin-shipments';
import type { ShipmentStage } from '@shared/enums';

const KEY = 'admin-shipments';

interface ListParams {
  branchId?: string;
  stage?: ShipmentStage;
  search?: string;
  page?: number;
  limit?: number;
}

export function useShipments(params: ListParams = {}) {
  return useQuery<Paginated<AdminShipment>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminShipment>('/admin/shipments', {
        query: { branchId: params.branchId, stage: params.stage, search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminShipmentCreateInput) => api.post<AdminShipment>('/admin/shipments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAdvanceShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & AdminShipmentAdvanceInput) =>
      api.put<AdminShipment>(`/admin/shipments/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shipments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
