'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface RevenueSummary {
  totalRevenue: number;
  totalCollected: number;
  outstanding: number;
  totalAppointments: number;
  uniqueCustomers: number;
}

export interface DoctorRevenue {
  employeeId: string;
  name: string;
  designation: string | null;
  totalRevenue: number;
  totalCollected: number;
  outstanding: number;
  appointmentCount: number;
  uniqueCustomers: number;
  avgRevenuePerAppointment: number;
}

export interface ServiceRevenue {
  serviceName: string;
  category: string | null;
  totalRevenue: number;
  totalCollected: number;
  outstanding: number;
  bookingCount: number;
  totalQty: number;
  avgRevenuePerBooking: number;
  avgCollectedPerBooking: number;
}

export interface RevenueReport {
  summary: RevenueSummary;
  doctors: DoctorRevenue[];
  services: ServiceRevenue[];
}

interface RevenueParams {
  from?: string;
  to?: string;
  branchId?: string;
}

export function useAdminRevenue(params: RevenueParams) {
  return useQuery<RevenueReport>({
    queryKey: ['admin-revenue', params.from, params.to, params.branchId],
    queryFn: () =>
      api.get<RevenueReport>('/admin/reports/revenue', {
        ...(params.from && { from: params.from }),
        ...(params.to && { to: params.to }),
        ...(params.branchId && { branchId: params.branchId }),
      }),
    staleTime: 60_000,
  });
}
