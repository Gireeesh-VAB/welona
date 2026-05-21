'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminOffer } from '@/types/admin-offer';
import type {
  AdminOfferCreateInput,
  AdminOfferUpdateInput,
} from '@/lib/admin-offers';

const KEY = 'admin-offers';

interface ListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export function useAdminOffers(params: ListParams = {}) {
  return useQuery<Paginated<AdminOffer>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminOffer>('/admin/offers', {
        query: { search: params.search, page: params.page, limit: params.limit },
      }),
  });
}

export function useCreateAdminOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminOfferCreateInput) =>
      api.post<AdminOffer>('/admin/offers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminOfferUpdateInput }) =>
      api.put<AdminOffer>(`/admin/offers/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/offers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
