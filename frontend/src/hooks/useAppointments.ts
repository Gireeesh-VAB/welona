'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Appointment, BookingDetail } from '@shared/types/customer-modules';

/** Service appointments for a given month (YYYY-MM). */
export function useAppointments(month: string) {
  return useQuery({
    queryKey: ['appointments', month],
    queryFn: () => api.get<Appointment[]>('/bookings', { month }),
  });
}

/** Full appointment detail, for the receipt. */
export function useBooking(id: string | null) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get<BookingDetail>(`/bookings/${id}`),
    enabled: !!id,
  });
}

/** Book a new service appointment. */
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ id: string; number: string | null }>('/bookings', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['customer-bookings'] });
    },
  });
}
