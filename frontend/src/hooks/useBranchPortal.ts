'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiList } from '@/lib/api-client';
import type { CouponLookupResult } from '@shared/types/admin-coupon';

// ---- Products ---------------------------------------------------------------

export interface BranchProduct {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  uom: string;
  categoryId: string | null;
  categoryName: string | null;
  purchasePrice: number;
  salePrice: number;
  mrp: number;
  reorderLevel: number | null;
  trackBatches: boolean;
  trackExpiry: boolean;
  isActive: boolean;
  imageUrl: string | null;
}

interface ProductParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export function useBranchProducts(params: ProductParams = {}) {
  return useQuery({
    queryKey: ['branch-products', params],
    queryFn: () =>
      apiList<BranchProduct>('/products', {
        query: {
          search: params.search,
          categoryId: params.categoryId,
          isActive: params.isActive,
          page: params.page ?? 1,
          limit: params.limit ?? 50,
        },
      }),
    staleTime: 2 * 60 * 1000,
  });
}

// ---- Inventory stock --------------------------------------------------------

export interface BranchStockRow {
  id: string;
  name: string;
  sku: string;
  uom: string;
  quantity: number;
  reorderLevel: number | null;
  salePrice: number;
  status: 'ok' | 'low_stock' | 'out_of_stock';
}

interface StockParams {
  branchId?: string;
  search?: string;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export function useBranchStock(params: StockParams = {}) {
  return useQuery({
    queryKey: ['branch-stock', params],
    queryFn: () =>
      apiList<BranchStockRow>('/inventory/stock', {
        query: {
          branchId: params.branchId,
          search: params.search,
          lowStockOnly: params.lowStockOnly,
          page: params.page ?? 1,
          limit: params.limit ?? 100,
        },
      }),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

// ---- Promotions -------------------------------------------------------------

export interface BranchPromotion {
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
  branchIds: string[];
  items: Array<{ id: string; categoryName: string; serviceName: string; quantity: number }>;
}

export function useBranchPromotions(activeOnly = false) {
  return useQuery({
    queryKey: ['branch-promotions', activeOnly],
    queryFn: () =>
      api.get<BranchPromotion[]>('/promotions', { activeOnly: activeOnly ? 'true' : 'false' }),
    staleTime: 30 * 1000,          // short stale time — picks up new admin assignments quickly
    refetchOnWindowFocus: true,    // refetch when user switches tab after admin makes changes
  });
}

// ---- Branches ---------------------------------------------------------------

export interface BranchInfo {
  id: string;
  name: string;
}

export function useBranchList() {
  return useQuery({
    queryKey: ['branch-list'],
    queryFn: () => api.get<BranchInfo[]>('/branches'),
    staleTime: 10 * 60 * 1000,
  });
}

// ---- Branch employees (doctors / staff working at the branch) ---------------

export interface BranchEmployee {
  id: string;
  name: string;
  employeeCode: string;
  designation: string | null;
  department: string | null;
  branchName: string | null;
  isActive: boolean;
}

/** Branch-scoped employee directory — for the prescription doctor picker etc. */
export function useBranchEmployees(designation?: string) {
  return useQuery({
    queryKey: ['branch-employees', designation ?? null],
    queryFn: () => api.get<BranchEmployee[]>('/employees', { designation }),
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Services (branch-assigned catalog) -------------------------------------

export interface BranchInventoryItem {
  productId: string;
  productName: string;
  productUom: string;
  quantityPerSession: number;
  onHandQty: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

export interface BranchService {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  hsnSacCode: string | null;
  minPrice: number;
  maxPrice: number;
  taxPercent: number;
  taxType: string;
  hasMeasurements: boolean;
  hasComplementary: boolean;
  isActive: boolean;
  categoryFlags: Record<string, boolean>;
  inventoryItems: BranchInventoryItem[];
  hasLowStock: boolean;
}

interface ServiceParams {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export function useBranchServices(params: ServiceParams = {}) {
  return useQuery({
    queryKey: ['branch-services', params],
    queryFn: () =>
      api.get<BranchService[]>('/services', {
        search: params.search,
        categoryId: params.categoryId,
        isActive: params.isActive,
      }),
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Complimentary config (branch % limit, for billing) --------------------

export interface BranchComplimentaryConfig {
  branchPercentage: number | null;
  limitIsActive: boolean;
}

/** Returns the branch's complimentary % limit configured by admin. */
export function useBranchComplimentaryConfig() {
  return useQuery({
    queryKey: ['branch-complimentary'],
    queryFn: () => api.get<BranchComplimentaryConfig>('/complimentary'),
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Stock Indents (restock requests from branch) ---------------------------

export interface BranchIndentItem {
  id: string;
  product: { id: string; name: string; sku: string; uom: string };
  requestedQty: number;
  approvedQty: number | null;
  rejectedQty: number | null;
  rejectionReason: string | null;
  fulfilledQty: number | null;
  receivedQty: number | null;
}

export interface BranchIndent {
  id: string;
  number: string | null;
  items: BranchIndentItem[];
  status: 'pending' | 'approved' | 'dispatched' | 'delivered' | 'closed' | 'rejected';
  reason: string | null;
  notes: string | null;
  vehicleNumber: string | null;
  driverName: string | null;
  driverMobile: string | null;
  dispatchedAt: string | null;
  expectedDeliveryAt: string | null;
  deliveryNotes: string | null;
  receivedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RaiseIndentInput {
  items: { productId: string; requestedQty: number }[];
  reason?: string;
  notes?: string;
}

export function useBranchIndents(status?: string) {
  return useQuery({
    queryKey: ['branch-indents', status ?? null],
    queryFn: () =>
      apiList<BranchIndent>('/indents', { query: { status, limit: 100 } }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useRaiseIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RaiseIndentInput) =>
      api.post<{ id: string; status: string }>('/indents', input),
    onSuccess: () => qc.refetchQueries({ queryKey: ['branch-indents'] }),
  });
}

export function useBranchGRNRecords() {
  return useQuery({
    queryKey: ['branch-grn-records'],
    queryFn: async () => {
      const [delivered, closed] = await Promise.all([
        apiList<BranchIndent>('/indents', { query: { status: 'delivered', limit: 200 } }),
        apiList<BranchIndent>('/indents', { query: { status: 'closed', limit: 200 } }),
      ]);
      return [...delivered.items, ...closed.items].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useBranchReceiveIndent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items, notes }: { id: string; items: { itemId: string; receivedQty: number }[]; notes?: string }) =>
      api.patch<unknown>(`/indents/${id}`, { action: 'deliver', items, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-indents'] });
      qc.invalidateQueries({ queryKey: ['branch-stock'], refetchType: 'all' });
      qc.invalidateQueries({ queryKey: ['branch-grn-records'] });
    },
  });
}

// ---- Branch info (for GST routing) -----------------------------------------

/** Returns the current branch's stateId and country — used for GST routing and form defaults. */
export function useBranchCurrentInfo() {
  return useQuery<{ stateId: string | null; country: string | null }>({
    queryKey: ['branch-current-info'],
    queryFn: () => api.get<{ stateId: string | null; country: string | null }>('/branches/current'),
    staleTime: 10 * 60 * 1000,
  });
}

// ---- Incoming Stock Transfers (branch receives from admin dispatch) ----------

export interface BranchTransferItem {
  id: string;
  product: { id: string; name: string; sku: string; uom: string };
  quantity: number;
}

export interface BranchIncomingTransfer {
  id: string;
  number: string;
  fromBranch: { id: string; name: string; code: string };
  toBranch?: { id: string; name: string; code: string };
  status: 'requested' | 'dispatched' | 'received';
  dispatchedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  items: BranchTransferItem[];
  createdAt: string;
}

interface TransferParams {
  direction?: 'incoming' | 'outgoing';
  page?: number;
  limit?: number;
}

export function useBranchIncomingTransfers(params: TransferParams = {}) {
  return useQuery({
    queryKey: ['branch-incoming-transfers', params],
    queryFn: () =>
      apiList<BranchIncomingTransfer>('/inventory/transfers', {
        query: { direction: 'incoming', page: params.page ?? 1, limit: params.limit ?? 20 },
      }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useBranchOutgoingTransfers(params: TransferParams = {}) {
  return useQuery({
    queryKey: ['branch-outgoing-transfers', params],
    queryFn: () =>
      apiList<BranchIncomingTransfer>('/inventory/transfers', {
        query: { direction: 'outgoing', page: params.page ?? 1, limit: params.limit ?? 20 },
      }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useBranchTransferAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dispatch' | 'receive' }) =>
      api.put<BranchIncomingTransfer>(`/inventory/transfers/${id}`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-incoming-transfers'] });
      qc.invalidateQueries({ queryKey: ['branch-outgoing-transfers'] });
      // refetchType: 'all' forces a refetch even on inactive/unmounted queries
      // so the "All Stock" tab reflects the new quantities immediately
      qc.invalidateQueries({ queryKey: ['branch-stock'], refetchType: 'all' });
    },
  });
}

// ---- Coupon lookup (billing) ------------------------------------------------

export { type CouponLookupResult };

/** Validate and look up a coupon code during billing. Returns coupon details or throws. */
export function useLookupCoupon() {
  return useMutation({
    mutationFn: (code: string) =>
      api.get<CouponLookupResult>('/coupons/lookup', { code }),
  });
}
