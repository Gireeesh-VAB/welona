'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { PackageSession, SessionEntry, SessionStats } from '@shared/types/customer-modules';
import type { SessionEntryCreateInput, SessionEntryUpdateInput } from '@shared/schemas/customer-modules';

export interface ConsumableUnitInfo {
  unitId:          string;
  status:          'open' | 'sealed';
  remaining:       number;
  totalCapacity:   number;
  usedQuantity:    number;
  willNeedNextUnit: boolean;
}

export interface SessionProduct {
  productId:          string;
  productName:        string;
  quantityPerSession: number;
  uom:                string | null;
  availableStock:     number | null;
  isLowStock:         boolean;
  isConsumable:       boolean;
  consumptionUom:     string | null;
  unitsPerPurchase:   number;
  consumableUnit:     ConsumableUnitInfo | null;
}

export interface ServiceProductGroup {
  serviceId:         string;
  serviceName:       string;
  effectiveSessions: number;
  products:          SessionProduct[];
}

const KEY = 'sessions';

interface SessionListParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export function useSessionPackages(params: SessionListParams = {}) {
  return useQuery<Paginated<PackageSession>>({
    queryKey: [KEY, 'list', params],
    queryFn: () =>
      apiList<PackageSession>('/sessions', {
        query: {
          search: params.search,
          status: params.status,
          page:   params.page,
          limit:  params.limit,
        },
      }),
  });
}

export function useSessionStats() {
  return useQuery<SessionStats>({
    queryKey: [KEY, 'stats'],
    queryFn: () => api.get<SessionStats>('/sessions/stats'),
  });
}

export function useSessionEntries(customerId: string, packageId: string) {
  return useQuery<SessionEntry[]>({
    queryKey: [KEY, 'entries', customerId, packageId],
    queryFn: () =>
      api.get<SessionEntry[]>(`/customers/${customerId}/packages/${packageId}/sessions`),
    enabled: !!customerId && !!packageId,
  });
}

export function useCreateSessionEntry(customerId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SessionEntryCreateInput) =>
      api.post<SessionEntry>(`/customers/${customerId}/packages/${packageId}/sessions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, 'entries', customerId, packageId] });
      qc.invalidateQueries({ queryKey: [KEY, 'list'] });
      qc.invalidateQueries({ queryKey: [KEY, 'stats'] });
    },
  });
}

export function useSessionProducts(packageId: string | undefined) {
  return useQuery<ServiceProductGroup[]>({
    queryKey: ['session-products', packageId],
    queryFn:  () => api.get<ServiceProductGroup[]>(`/sessions/${packageId}/products`),
    enabled:  !!packageId,
    staleTime: 0,
  });
}

export function useUpdateSessionEntry(customerId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, body }: { sessionId: string; body: SessionEntryUpdateInput }) =>
      api.patch<SessionEntry>(
        `/customers/${customerId}/packages/${packageId}/sessions/${sessionId}`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, 'entries', customerId, packageId] });
      qc.invalidateQueries({ queryKey: [KEY, 'list'] });
      qc.invalidateQueries({ queryKey: [KEY, 'stats'] });
    },
  });
}
