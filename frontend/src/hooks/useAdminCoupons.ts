'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList, type Paginated } from '@/lib/api-client';
import type { AdminCoupon } from '@shared/types/admin-coupon';
import type { AdminCouponCreateInput, AdminCouponUpdateInput } from '@shared/schemas/admin-coupon';

const KEY = 'admin-coupons';

interface ListParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export function useAdminCoupons(params: ListParams = {}) {
  return useQuery<Paginated<AdminCoupon>>({
    queryKey: [KEY, params],
    queryFn: () =>
      apiList<AdminCoupon>('/admin/coupons', {
        query: {
          search:   params.search,
          isActive: params.isActive,
          page:     params.page,
          limit:    params.limit,
        },
      }),
  });
}

export function useCreateAdminCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCouponCreateInput) =>
      api.post<AdminCoupon>('/admin/coupons', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateAdminCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminCouponUpdateInput }) =>
      api.put<AdminCoupon>(`/admin/coupons/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteAdminCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
