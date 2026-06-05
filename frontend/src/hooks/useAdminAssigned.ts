'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AssignedService {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string | null;
  minPrice: number;
  maxPrice: number;
  taxPercent: number;
  hasMeasurements: boolean;
  hasComplementary: boolean;
  isActive: boolean;
}

export interface AssignedProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  uom: string;
  categoryId: string | null;
  categoryName: string | null;
  salePrice: number;
  mrp: number;
  reorderLevel: number;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  imageUrl: string | null;
}

export interface AssignedPaymentMode {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AssignedCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AssignedOffer {
  id: string;
  packageName: string;
  packageCode: string;
  fromDate: string;
  toDate: string;
  minAmount: number;
  maxAmount: number;
  remarks: string | null;
  frontImageUrl: string | null;
  isActive: boolean;
  isCurrentlyActive: boolean;
  items: Array<{ id: string; serviceName: string; categoryName: string; quantity: number }>;
}

export interface AssignedStaff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleKey: string;
  avatarUrl: string | null;
  status: string;
}

export interface AdminAssignedData {
  branch: { id: string; name: string; code: string };
  fetchedAt: string;
  services: AssignedService[];
  products: AssignedProduct[];
  paymentModes: AssignedPaymentMode[];
  categories: AssignedCategory[];
  offers: AssignedOffer[];
  staff: AssignedStaff[];
  summary: {
    totalServices: number;
    totalProducts: number;
    totalPaymentModes: number;
    totalCategories: number;
    totalOffers: number;
    totalStaff: number;
    totalAssigned: number;
  };
}

/**
 * Fetches all data the admin has explicitly assigned to the logged-in
 * branch. Refetches on window focus so changes made in the admin panel
 * are reflected quickly without a manual page reload.
 */
export function useAdminAssigned() {
  return useQuery({
    queryKey: ['admin-assigned'],
    queryFn: () => api.get<AdminAssignedData>('/admin-assigned'),
    staleTime: 30 * 1000,       // treat as fresh for 30s
    refetchOnWindowFocus: true,  // pick up admin changes when user re-focuses tab
  });
}
