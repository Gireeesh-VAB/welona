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
    mutationFn: ({ bookingId, action, amount, notes }: { bookingId: string; action: 'cancel' | 'pay' | 'note'; amount?: number; notes?: string }) => {
      const body = action === 'cancel'
        ? { status: 'cancelled' }
        : action === 'note'
        ? { notes }
        : { paidAmount: amount ?? 0 };
      return api.patch(`/customers/${customerId}/bookings/${bookingId}`, body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-bookings', customerId] }),
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
