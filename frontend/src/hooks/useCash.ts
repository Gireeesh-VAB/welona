'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  CashCount,
  DayClose,
  DayCloseSummary,
  PettyCashData,
  Voucher,
} from '@shared/types/cash';

type Body = Record<string, unknown>;

// --- Cash denomination ------------------------------------------------------

export function useCashCounts() {
  return useQuery({
    queryKey: ['cash-counts'],
    queryFn: () => api.get<CashCount[]>('/cash/denominations'),
  });
}

export function useCreateCashCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post('/cash/denominations', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-counts'] }),
  });
}

// --- Petty cash -------------------------------------------------------------

export function usePettyCash() {
  return useQuery({
    queryKey: ['petty-cash'],
    queryFn: () => api.get<PettyCashData>('/cash/petty-cash'),
  });
}

export function useCreatePettyCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post('/cash/petty-cash', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty-cash'] }),
  });
}

// --- Vouchers ---------------------------------------------------------------

export function useVouchers() {
  return useQuery({
    queryKey: ['vouchers'],
    queryFn: () => api.get<Voucher[]>('/cash/vouchers'),
  });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<Voucher>('/cash/vouchers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vouchers'] }),
  });
}

// --- Day close --------------------------------------------------------------

export function useDayCloses() {
  return useQuery({
    queryKey: ['day-closes'],
    queryFn: () => api.get<DayClose[]>('/cash/day-close'),
  });
}

export function useDayCloseSummary(date: string) {
  return useQuery({
    queryKey: ['day-close-summary', date],
    queryFn: () => api.get<DayCloseSummary>('/cash/day-close/summary', { date }),
    enabled: !!date,
  });
}

export function useCreateDayClose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<DayClose>('/cash/day-close', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['day-closes'] });
      qc.invalidateQueries({ queryKey: ['day-close-summary'] });
    },
  });
}
