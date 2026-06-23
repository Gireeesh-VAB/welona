'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
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
 * React Query hooks for the Phase 2 customer relationship modules. Each
 * module follows the same shape: a list query plus create/update mutations,
 * all scoped to a customer.
 */

type Body = Record<string, unknown>;

/** Build the list/create/update hook trio for one customer-scoped module. */
function makeModuleHooks<T>(module: string, queryKey: string) {
  const path = (customerId: string) => `/customers/${customerId}/${module}`;

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

const bookings = makeModuleHooks<Booking>('bookings', 'customer-bookings');
export const useBookings = bookings.useList;
export const useCreateBooking = bookings.useCreate;
export const useUpdateBooking = bookings.useUpdate;

export function useBookingAction(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, action, amount, notes, paymentMode, serviceAllocations }: {
      bookingId: string;
      action: 'cancel' | 'pay' | 'note';
      amount?: number;
      notes?: string;
      paymentMode?: string;
      serviceAllocations?: Array<{ bookingItemId: string; amount: number }>;
    }) => {
      const body = action === 'cancel'
        ? { status: 'cancelled' }
        : action === 'note'
        ? { notes }
        : {
            paidAmount: amount ?? 0,
            ...(paymentMode ? { paymentMode } : {}),
            ...(serviceAllocations?.length ? { serviceAllocations } : {}),
          };
      return api.patch(`/customers/${customerId}/bookings/${bookingId}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-bookings', customerId] });
      qc.invalidateQueries({ queryKey: ['customer-sales', customerId] });
    },
  });
}

const packages = makeModuleHooks<Package>('packages', 'customer-packages');
export const usePackages = packages.useList;
export const useCreatePackage = packages.useCreate;
export const useUpdatePackage = packages.useUpdate;

export function usePackageCheckout(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) =>
      api.post<{ package: Package; invoice: Record<string, unknown> }>(
        `/customers/${customerId}/packages/checkout`,
        body,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-packages', customerId] });
    },
  });
}

export function useAddPackageSession(customerId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) =>
      api.post(`/customers/${customerId}/packages/${packageId}/sessions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-packages', customerId] });
    },
  });
}

export function useBookingSessions(customerId: string, bookingId: string) {
  return useQuery({
    queryKey: ['booking-sessions', customerId, bookingId],
    queryFn: () => api.get<{ items: any[]; sessions: any[] }>(`/customers/${customerId}/bookings/${bookingId}/sessions`),
    enabled: !!customerId && !!bookingId,
  });
}

export function useAddBookingSession(customerId: string, bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) =>
      api.post(`/customers/${customerId}/bookings/${bookingId}/sessions`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-sessions', customerId, bookingId] });
    },
  });
}

export function useUpdateBookingSession(customerId: string, bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, ...body }: { sessionId: string } & Body) =>
      api.patch(`/customers/${customerId}/bookings/${bookingId}/sessions/${sessionId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking-sessions', customerId, bookingId] });
    },
  });
}

export function useSessionEmployees() {
  return useQuery({
    queryKey: ['session-employees'],
    queryFn: () => api.get<any[]>('/employees'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSessionProducts(search?: string) {
  return useQuery({
    queryKey: ['session-products', search],
    queryFn: () => api.get<any>(`/products?limit=100${search ? `&search=${encodeURIComponent(search)}` : ''}&isActive=true`),
    staleTime: 60 * 1000,
  });
}

export function useServiceDefaultProducts(serviceName: string | null | undefined, branchId?: string | null) {
  return useQuery({
    queryKey: ['service-default-products', serviceName, branchId ?? ''],
    queryFn: () => {
      let url = `/sessions/service-defaults?serviceName=${encodeURIComponent(serviceName!)}`;
      if (branchId) url += `&branchId=${encodeURIComponent(branchId)}`;
      return api.get<Array<{ productId: string; productName: string; quantityPerSession: number; chargeType: string; uom: string | null; availableStock: number | null }>>(url);
    },
    enabled: !!serviceName,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStartBookingSession(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, bookingId, body }: { sessionId: string; bookingId: string; body: Record<string, unknown> }) =>
      api.patch(`/customers/${customerId}/bookings/${bookingId}/sessions/${sessionId}`, body),
    onSuccess: (_, { bookingId }) => qc.invalidateQueries({ queryKey: ['booking-sessions', customerId, bookingId] }),
  });
}

export function useCompleteBookingSession(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, bookingId, body }: { sessionId: string; bookingId: string; body: Record<string, unknown> }) =>
      api.patch(`/customers/${customerId}/bookings/${bookingId}/sessions/${sessionId}`, body),
    onSuccess: (_, { bookingId }) => qc.invalidateQueries({ queryKey: ['booking-sessions', customerId, bookingId] }),
  });
}

const offers = makeModuleHooks<Offer>('offers', 'customer-offers');
export const useOffers = offers.useList;
export const useCreateOffer = offers.useCreate;
export const useUpdateOffer = offers.useUpdate;

const prescriptions = makeModuleHooks<Prescription>('prescriptions', 'customer-prescriptions');
export const usePrescriptions = prescriptions.useList;
export const useCreatePrescription = prescriptions.useCreate;
export const useUpdatePrescription = prescriptions.useUpdate;

export function useDeletePrescription(customerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prescriptionId: string) =>
      api.delete(`/customers/${customerId}/prescriptions/${prescriptionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-prescriptions', customerId] }),
  });
}

const medicalReports = makeModuleHooks<MedicalReport>('medical-reports', 'customer-medical-reports');
export const useMedicalReports = medicalReports.useList;
export const useCreateMedicalReport = medicalReports.useCreate;
export const useUpdateMedicalReport = medicalReports.useUpdate;

const feedback = makeModuleHooks<Feedback>('feedback', 'customer-feedback');
export const useFeedback = feedback.useList;
export const useCreateFeedback = feedback.useCreate;

const documents = makeModuleHooks<CustomerDocument>('documents', 'customer-documents');
export const useDocuments = documents.useList;
export const useCreateDocument = documents.useCreate;

/** A customer's read-only aggregated activity timeline. */
export function useCustomerHistory(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-history', customerId],
    queryFn: () => api.get<HistoryEvent[]>(`/customers/${customerId}/history`),
    enabled: !!customerId,
  });
}
