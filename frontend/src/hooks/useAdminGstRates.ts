'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type { AdminGstRate } from '@shared/types/admin-gst-rate';
import type { AdminGstRateCreateInput } from '@shared/schemas/admin-gst-rates';

export function useAdminGstRates(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['admin-gst-rates', params],
    queryFn: () => apiList<AdminGstRate>('/admin/gst-rates', { query: params }),
    staleTime: 60_000,
  });
}

export function useCreateAdminGstRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminGstRateCreateInput) => api.post<AdminGstRate>('/admin/gst-rates', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-gst-rates'] }),
  });
}

export function useUpdateAdminGstRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AdminGstRateCreateInput> }) =>
      api.put<AdminGstRate>(`/admin/gst-rates/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-gst-rates'] }),
  });
}

export function useDeleteAdminGstRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/gst-rates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-gst-rates'] }),
  });
}

export function useGstRates() {
  return useQuery({
    queryKey: ['gst-rates'],
    queryFn: () => api.get<AdminGstRate[]>('/gst-rates'),
    staleTime: 5 * 60_000,
  });
}
