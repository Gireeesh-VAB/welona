'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type {
  Customer,
  CustomerSales,
  Delivery,
  FollowUp,
  Invoice,
  Lead,
  Payment,
  Quotation,
  MasterOption,
  PendingPaymentsData,
  SalesDashboard,
  SalesOrder,
  Treatment,
} from '@/types/sales';

/** Loose query params for list endpoints. */
export type ListParams = Record<string, string | number | undefined>;

/** Invalidate every sales-related query after a pipeline mutation. */
function invalidateSales(qc: QueryClient) {
  for (const key of [
    'sales-dashboard',
    'customers',
    'customer-sales',
    'customer-followups',
    'leads',
    'lead',
    'followups',
    'quotations',
    'orders',
    'invoices',
    'pending-payments',
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

// --- Dashboard --------------------------------------------------------------

export function useSalesDashboard() {
  return useQuery({
    queryKey: ['sales-dashboard'],
    queryFn: () => api.get<SalesDashboard>('/sales/dashboard'),
  });
}

export function useSalespeople() {
  return useQuery({
    queryKey: ['salespeople'],
    queryFn: () => api.get<Array<{ id: string; name: string; roleName: string }>>('/sales/salespeople'),
    staleTime: 5 * 60 * 1000,
  });
}

// --- Customers --------------------------------------------------------------

export function useCustomers(params: ListParams = {}) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => apiList<Customer>('/customers', { query: params }),
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useCustomerSales(id: string | null) {
  return useQuery({
    queryKey: ['customer-sales', id],
    queryFn: () => api.get<CustomerSales>(`/customers/${id}/sales`),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Customer>('/customers', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch<Customer>(`/customers/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', id] });
    },
  });
}

// --- Leads ------------------------------------------------------------------

export function useLeads(params: ListParams = {}) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => apiList<Lead>('/sales/leads', { query: params }),
  });
}

export function useLead(id: string | null) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<Lead>(`/sales/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Lead>('/sales/leads', body),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Lead>(`/sales/leads/${id}`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, lostReason }: { id: string; status: string; lostReason?: string }) =>
      api.post<Lead>(`/sales/leads/${id}/status`, { status, lostReason }),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Quotation>(`/sales/leads/${id}/convert`),
    onSuccess: () => invalidateSales(qc),
  });
}

/** Promote an enquiry into a dedicated Customer Profile. */
export function useConvertLeadToCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Customer>(`/sales/leads/${id}/convert-customer`),
    onSuccess: () => invalidateSales(qc),
  });
}

// --- Master options (configurable dropdowns) -------------------------------

export function useMasterOptions(kind: string) {
  return useQuery({
    queryKey: ['master-options', kind],
    queryFn: () => api.get<MasterOption[]>('/master-options', { kind }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMasterOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<MasterOption>('/master-options', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-options'] }),
  });
}

export function useUpdateMasterOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<MasterOption>(`/master-options/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-options'] }),
  });
}

export function useDeactivateMasterOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/master-options/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-options'] }),
  });
}

// --- Treatments (master) ----------------------------------------------------

export function useTreatments() {
  return useQuery({
    queryKey: ['treatments'],
    queryFn: () => api.get<Treatment[]>('/treatments'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Treatment>('/treatments', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treatments'] }),
  });
}

export function useUpdateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Treatment>(`/treatments/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treatments'] }),
  });
}

export function useDeactivateTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/treatments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treatments'] }),
  });
}

// --- Follow-ups -------------------------------------------------------------

export function useFollowUps(leadId: string | null) {
  return useQuery({
    queryKey: ['followups', leadId],
    queryFn: () => api.get<FollowUp[]>(`/sales/leads/${leadId}/followups`),
    enabled: !!leadId,
  });
}

/** All follow-up interactions for a customer (across their enquiries). */
export function useCustomerFollowUps(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-followups', customerId],
    queryFn: () => api.get<FollowUp[]>(`/customers/${customerId}/followups`),
    enabled: !!customerId,
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, body }: { leadId: string; body: Record<string, unknown> }) =>
      api.post<FollowUp>(`/sales/leads/${leadId}/followups`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<FollowUp>(`/sales/followups/${id}`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

// --- Quotations -------------------------------------------------------------

export function useQuotations(params: ListParams = {}) {
  return useQuery({
    queryKey: ['quotations', params],
    queryFn: () => apiList<Quotation>('/sales/quotations', { query: params }),
  });
}

export function useQuotation(id: string | null) {
  return useQuery({
    queryKey: ['quotation', id],
    queryFn: () => api.get<Quotation>(`/sales/quotations/${id}`),
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Quotation>('/sales/quotations', body),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useUpdateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<Quotation>(`/sales/quotations/${id}`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

/** Run a quotation pipeline action: send | approve | reject | convert. */
export function useQuotationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: 'send' | 'approve' | 'reject' | 'convert';
      body?: Record<string, unknown>;
    }) => api.post<Quotation | SalesOrder>(`/sales/quotations/${id}/${action}`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

// --- Orders & deliveries ----------------------------------------------------

export function useOrders(params: ListParams = {}) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => apiList<SalesOrder>('/sales/orders', { query: params }),
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<SalesOrder>(`/sales/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<SalesOrder>('/sales/orders', body),
    onSuccess: () => invalidateSales(qc),
  });
}

/** Unified "New Sale" — creates a confirmed order plus an optional invoice. */
export function useQuickSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<{ order: SalesOrder; invoice: Invoice | null }>('/sales/quick-sale', body),
    onSuccess: () => invalidateSales(qc),
  });
}

/** Reassign an order's salesperson or edit its notes. */
export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.patch<SalesOrder>(`/sales/orders/${id}`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.post<SalesOrder>(`/sales/orders/${id}/status`, { status }),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: { orderId: string; body: Record<string, unknown> }) =>
      api.post<Delivery>(`/sales/orders/${orderId}/deliveries`, body),
    onSuccess: () => invalidateSales(qc),
  });
}

/** Advance a delivery: dispatch | complete. */
export function useDeliveryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dispatch' | 'complete' }) =>
      api.post<Delivery>(`/sales/deliveries/${id}/${action}`),
    onSuccess: () => invalidateSales(qc),
  });
}

// --- Invoices & payments ----------------------------------------------------

export function useInvoices(params: ListParams = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => apiList<Invoice>('/sales/invoices', { query: params }),
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<Invoice>(`/sales/invoices/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<Invoice>('/sales/invoices', body),
    onSuccess: () => invalidateSales(qc),
  });
}

export function useIssueInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Invoice>(`/sales/invoices/${id}/issue`),
    onSuccess: () => invalidateSales(qc),
  });
}

/** Every issued invoice with an outstanding balance. */
export function usePendingPayments() {
  return useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => api.get<PendingPaymentsData>('/pending-payments'),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, body }: { invoiceId: string; body: Record<string, unknown> }) =>
      api.post<Payment>(`/sales/invoices/${invoiceId}/payments`, body),
    onSuccess: () => invalidateSales(qc),
  });
}
