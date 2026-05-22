'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/** A collection broken down by payment method, with a total. */
export interface CollectionBreakdown {
  items: Array<{ method: string; amount: number }>;
  total: number;
}

export interface DashboardData {
  kpis: {
    todayEnquiries: number;
    todayWalkIns: number;
    monthCollection: number;
    todayFollowupsDue: number;
  };
  todayCollection: CollectionBreakdown;
  monthCollection: CollectionBreakdown & { fromDate: string };
  treatmentBreakdown: Array<{ treatmentId: string | null; name: string; enquiries: number }>;
  employeeCollection: Array<{ staffId: string; name: string; amount: number }>;
  followupsDue: Array<{
    id: string;
    contactName: string;
    note: string | null;
    dueAt: string | null;
    assignedTo: string | null;
  }>;
}

/** Operations dashboard — today's activity, collections and follow-ups. */
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/dashboard'),
  });
}
