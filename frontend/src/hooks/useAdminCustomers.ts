'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type { Customer, CustomerSales, FollowUp } from '@shared/types/sales';
import type {
  Booking,
  CustomerDocument,
  Feedback,
  HistoryEvent,
  MedicalReport,
  Offer,
  Package,
  Prescription,
} from '@shared/types/customer-modules';

/**
 * Admin-panel customer hooks (admin + branch sessions).
 *
 * Mirror of the employee-side `useSales`/`useCustomerModules` customer hooks,
 * but pointed at `/admin/customers/*` so admin and branch sessions get the
 * right auth pool + branch scoping (and token refresh routes correctly — only
 * `/admin/*` paths refresh the admin/branch pools). Query keys are prefixed
 * `admin-` so they never collide with the employee-side caches.
 */
type ListParams = Record<string, string | number | undefined>;
type Body = Record<string, unknown>;

export function useAdminCustomers(params: ListParams = {}) {
  return useQuery({
    queryKey: ['admin-customers', params],
    queryFn: () => apiList<Customer>('/admin/customers', { query: params }),
  });
}

export function useAdminCustomer(id: string | null) {
  return useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => api.get<Customer>(`/admin/customers/${id}`),
    enabled: !!id,
  });
}

export function useAdminCustomerSales(id: string | null) {
  return useQuery({
    queryKey: ['admin-customer-sales', id],
    queryFn: () => api.get<CustomerSales>(`/admin/customers/${id}/sales`),
    enabled: !!id,
  });
}

export function useCreateAdminCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<Customer>('/admin/customers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-customers'] }),
  });
}

export function useUpdateAdminCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.patch<Customer>(`/admin/customers/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-customers'] });
      qc.invalidateQueries({ queryKey: ['admin-customer', id] });
    },
  });
}

export function useAdminCustomerFollowUps(customerId: string | null) {
  return useQuery({
    queryKey: ['admin-customer-followups', customerId],
    queryFn: () => api.get<FollowUp[]>(`/admin/customers/${customerId}/followups`),
    enabled: !!customerId,
  });
}

export function useAdminCustomerHistory(customerId: string | null) {
  return useQuery({
    queryKey: ['admin-customer-history', customerId],
    queryFn: () => api.get<HistoryEvent[]>(`/admin/customers/${customerId}/history`),
    enabled: !!customerId,
  });
}

/** Build the list/create/update hook trio for one admin customer-scoped module. */
function makeModuleHooks<T>(module: string, queryKey: string) {
  const path = (customerId: string) => `/admin/customers/${customerId}/${module}`;

  function useList(customerId: string | null) {
    return useQuery({
      queryKey: [queryKey, customerId],
      queryFn: () => api.get<T[]>(path(customerId as string)),
      enabled: !!customerId,
    });
  }

  function useCreate(customerId: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (body: Body) => api.post<T>(path(customerId), body),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey, customerId] }),
    });
  }

  function useUpdate(customerId: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body: Body }) =>
        api.patch<T>(`${path(customerId)}/${id}`, body),
      onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey, customerId] }),
    });
  }

  return { useList, useCreate, useUpdate };
}

const bookings = makeModuleHooks<Booking>('bookings', 'admin-customer-bookings');
export const useAdminBookings = bookings.useList;
export const useCreateAdminBooking = bookings.useCreate;
export const useUpdateAdminBooking = bookings.useUpdate;

const packages = makeModuleHooks<Package>('packages', 'admin-customer-packages');
export const useAdminPackages = packages.useList;
export const useCreateAdminPackage = packages.useCreate;
export const useUpdateAdminPackage = packages.useUpdate;

const offers = makeModuleHooks<Offer>('offers', 'admin-customer-offers');
export const useAdminOffers = offers.useList;
export const useCreateAdminOffer = offers.useCreate;
export const useUpdateAdminOffer = offers.useUpdate;

const prescriptions = makeModuleHooks<Prescription>('prescriptions', 'admin-customer-prescriptions');
export const useAdminPrescriptions = prescriptions.useList;
export const useCreateAdminPrescription = prescriptions.useCreate;
export const useUpdateAdminPrescription = prescriptions.useUpdate;

const medicalReports = makeModuleHooks<MedicalReport>('medical-reports', 'admin-customer-medical-reports');
export const useAdminMedicalReports = medicalReports.useList;
export const useCreateAdminMedicalReport = medicalReports.useCreate;
export const useUpdateAdminMedicalReport = medicalReports.useUpdate;

const feedback = makeModuleHooks<Feedback>('feedback', 'admin-customer-feedback');
export const useAdminFeedback = feedback.useList;
export const useCreateAdminFeedback = feedback.useCreate;

const documents = makeModuleHooks<CustomerDocument>('documents', 'admin-customer-documents');
export const useAdminDocuments = documents.useList;
export const useCreateAdminDocument = documents.useCreate;
