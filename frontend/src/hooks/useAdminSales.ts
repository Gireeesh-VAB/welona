'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type {
  Customer,
  Delivery,
  FollowUp,
  Invoice,
  Lead,
  MasterOption,
  Payment,
  Quotation,
  SalesDashboard,
  SalesOrder,
  Treatment,
} from '@shared/types/sales';

/**
 * Admin-panel sales-pipeline hooks (admin + branch sessions).
 *
 * Mirror of the employee-side `useSales` pipeline hooks, pointed at
 * `/admin/sales/*` (+ `/admin/treatments`, `/admin/master-options`) so admin
 * and branch sessions hit the right auth pool + branch scoping (and token
 * refresh routes correctly — only `/admin/*` refreshes the admin/branch pools).
 * Query keys are prefixed `admin-` to avoid colliding with employee caches.
 */
type ListParams = Record<string, string | number | undefined>;
type Body = Record<string, unknown>;

/** Invalidate every admin sales-related query after a pipeline mutation. */
function invalidate(qc: QueryClient) {
  for (const key of [
    'admin-sales-dashboard',
    'admin-customers',
    'admin-customer-sales',
    'admin-leads',
    'admin-lead',
    'admin-followups',
    'admin-quotations',
    'admin-orders',
    'admin-invoices',
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

// --- Dashboard + reference -------------------------------------------------

export function useAdminSalesDashboard() {
  return useQuery({
    queryKey: ['admin-sales-dashboard'],
    queryFn: () => api.get<SalesDashboard>('/admin/sales/dashboard'),
  });
}

export function useAdminSalespeople() {
  return useQuery({
    queryKey: ['admin-salespeople'],
    queryFn: () =>
      api.get<Array<{ id: string; name: string; roleName: string }>>('/admin/sales/salespeople'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminTreatments() {
  return useQuery({
    queryKey: ['admin-treatments'],
    queryFn: () => api.get<Treatment[]>('/admin/treatments'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminMasterOptions(kind: string) {
  return useQuery({
    queryKey: ['admin-master-options', kind],
    queryFn: () => api.get<MasterOption[]>('/admin/master-options', { kind }),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Leads ------------------------------------------------------------------

export function useAdminLeads(params: ListParams = {}) {
  return useQuery({
    queryKey: ['admin-leads', params],
    queryFn: () => apiList<Lead>('/admin/sales/leads', { query: params }),
  });
}

export function useAdminLead(id: string | null) {
  return useQuery({
    queryKey: ['admin-lead', id],
    queryFn: () => api.get<Lead>(`/admin/sales/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateAdminLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<Lead>('/admin/sales/leads', body),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateAdminLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Body }) =>
      api.patch<Lead>(`/admin/sales/leads/${id}`, body),
    onSuccess: () => invalidate(qc),
  });
}

export function useAdminLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, lostReason }: { id: string; status: string; lostReason?: string }) =>
      api.post<Lead>(`/admin/sales/leads/${id}/status`, { status, lostReason }),
    onSuccess: () => invalidate(qc),
  });
}

export function useConvertAdminLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Quotation>(`/admin/sales/leads/${id}/convert`),
    onSuccess: () => invalidate(qc),
  });
}

export function useConvertAdminLeadToCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Customer>(`/admin/sales/leads/${id}/convert-customer`),
    onSuccess: () => invalidate(qc),
  });
}

// --- Follow-ups -------------------------------------------------------------

export function useAdminFollowUps(leadId: string | null) {
  return useQuery({
    queryKey: ['admin-followups', leadId],
    queryFn: () => api.get<FollowUp[]>(`/admin/sales/leads/${leadId}/followups`),
    enabled: !!leadId,
  });
}

export function useCreateAdminFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, body }: { leadId: string; body: Body }) =>
      api.post<FollowUp>(`/admin/sales/leads/${leadId}/followups`, body),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateAdminFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Body }) =>
      api.patch<FollowUp>(`/admin/sales/followups/${id}`, body),
    onSuccess: () => invalidate(qc),
  });
}

// --- Quotations -------------------------------------------------------------

export function useAdminQuotations(params: ListParams = {}) {
  return useQuery({
    queryKey: ['admin-quotations', params],
    queryFn: () => apiList<Quotation>('/admin/sales/quotations', { query: params }),
  });
}

export function useAdminQuotation(id: string | null) {
  return useQuery({
    queryKey: ['admin-quotation', id],
    queryFn: () => api.get<Quotation>(`/admin/sales/quotations/${id}`),
    enabled: !!id,
  });
}

export function useCreateAdminQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<Quotation>('/admin/sales/quotations', body),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateAdminQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Body }) =>
      api.patch<Quotation>(`/admin/sales/quotations/${id}`, body),
    onSuccess: () => invalidate(qc),
  });
}

export function useAdminQuotationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: 'send' | 'approve' | 'reject' | 'convert';
      body?: Body;
    }) => api.post<Quotation | SalesOrder>(`/admin/sales/quotations/${id}/${action}`, body),
    onSuccess: () => invalidate(qc),
  });
}

// --- Orders & deliveries ----------------------------------------------------

export function useAdminOrders(params: ListParams = {}) {
  return useQuery({
    queryKey: ['admin-orders', params],
    queryFn: () => apiList<SalesOrder>('/admin/sales/orders', { query: params }),
  });
}

export function useAdminOrder(id: string | null) {
  return useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => api.get<SalesOrder>(`/admin/sales/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateAdminOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<SalesOrder>('/admin/sales/orders', body),
    onSuccess: () => invalidate(qc),
  });
}

export function useAdminQuickSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) =>
      api.post<{ order: SalesOrder; invoice: Invoice | null }>('/admin/sales/quick-sale', body),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateAdminOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Body }) =>
      api.patch<SalesOrder>(`/admin/sales/orders/${id}`, body),
    onSuccess: () => invalidate(qc),
  });
}

export function useAdminOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post<SalesOrder>(`/admin/sales/orders/${id}/status`, { status }),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateAdminDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: Body }) =>
      api.post<Delivery>(`/admin/sales/orders/${orderId}/deliveries`, body),
    onSuccess: () => invalidate(qc),
  });
}

export function useAdminDeliveryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dispatch' | 'complete' | 'return' }) =>
      api.post<Delivery>(`/admin/sales/deliveries/${id}/${action}`),
    onSuccess: () => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['admin-inventory-stock'] });
      qc.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
    },
  });
}

// --- Invoices & payments ----------------------------------------------------

export function useAdminInvoices(params: ListParams = {}) {
  return useQuery({
    queryKey: ['admin-invoices', params],
    queryFn: () => apiList<Invoice>('/admin/sales/invoices', { query: params }),
  });
}

export function useAdminInvoice(id: string | null) {
  return useQuery({
    queryKey: ['admin-invoice', id],
    queryFn: () => api.get<Invoice>(`/admin/sales/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateAdminInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Body) => api.post<Invoice>('/admin/sales/invoices', body),
    onSuccess: () => invalidate(qc),
  });
}

export function useIssueAdminInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Invoice>(`/admin/sales/invoices/${id}/issue`),
    onSuccess: () => invalidate(qc),
  });
}

export function useRecordAdminPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, body }: { invoiceId: string; body: Body }) =>
      api.post<Payment>(`/admin/sales/invoices/${invoiceId}/payments`, body),
    onSuccess: () => invalidate(qc),
  });
}
