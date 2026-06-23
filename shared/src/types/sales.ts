/**
 * UI-facing types for the sales pipeline. These mirror the API responses
 * (src/app/api/v1/...): money is integer minor units, dates are ISO strings.
 */

/** A compact `{ id, name }` reference embedded in list/detail responses. */
export interface Ref {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  branchId: string | null;
  type: 'individual' | 'business';
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  gstin: string | null;
  address: string | null;
  city: string | null;
  stateId: string | null;
  stateName: string | null;
  country: string | null;
  notes: string | null;
  gender: string | null;
  avatarUrl: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  branch?: Ref | null;
}

/** A configurable dropdown option (enquiry type, media, call type). */
export interface MasterOption {
  id: string;
  kind: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

/** A treatment/service in the master catalogue (managed in Settings). */
export interface Treatment {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  durationMinutes: number | null;
  price: number | null;
  isActive: boolean;
  createdAt: string;
}

/** A logged follow-up interaction against an enquiry. */
export interface FollowUp {
  id: string;
  leadId: string;
  customerId: string | null;
  contactedAt: string | null;
  dueAt: string | null;
  note: string | null;
  remarks: string | null;
  status: string;
  outcome: string | null;
  completedAt: string | null;
  assignedToId: string | null;
  createdAt: string;
}

/** An invoice with an outstanding balance (GET /pending-payments). */
export interface PendingPayment {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  total: number;
  amountPaid: number;
  outstanding: number;
  dueAt: string | null;
  status: string;
}

/** The pending-payments payload: outstanding invoices plus a summary. */
export interface PendingPaymentsData {
  invoices: PendingPayment[];
  summary: { count: number; totalOutstanding: number };
}

/** A follow-up row in the org-wide worklist (GET /sales/followups). */
export interface SalesFollowUp {
  id: string;
  leadId: string;
  contactName: string;
  leadStatus: string | null;
  note: string | null;
  contactedAt: string | null;
  dueAt: string | null;
  status: string;
  outcome: string | null;
  assignedToName: string | null;
}

export interface Lead {
  id: string;
  branchId: string | null;
  customerId: string | null;
  treatmentId: string | null;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  source: string;
  status: string;
  interest: string | null;
  gender: string | null;
  enquiryType: string | null;
  media: string | null;
  callType: string | null;
  healthStatus: string | null;
  leadTransfer: boolean;
  estimatedValue: number | null;
  ownerStaffId: string;
  notes: string | null;
  lostReason: string | null;
  transferredFromId: string | null;
  transferredToId: string | null;
  transferredAt: string | null;
  transferNotes: string | null;
  createdAt: string;
  owner?: Ref;
  customer?: Ref | null;
  branch?: Ref | null;
  treatment?: Ref | null;
  transferredFromBranch?: Ref | null;
  quotations?: Array<{ id: string; number: string; status: string; total: number }>;
  /** Next pending follow-up(s) — the list endpoint returns at most one. */
  followUps?: FollowUp[];
}

export interface LineItem {
  id: string;
  description: string;
  productId: string | null;
  quantity: number;
  quantityDelivered?: number;
  unitPrice: number;
  discountAmt: number;
  taxRate: number;
  lineTotal: number;
  sortOrder: number;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string;
  ownerStaffId: string;
  status: string;
  validUntil: string | null;
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
  notes: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  customer?: Ref;
  owner?: Ref;
  items?: LineItem[];
  order?: { id: string; number: string; status: string } | null;
  lead?: { id: string; contactName: string } | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  status: string;
  scheduledFor: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  trackingRef: string | null;
  notes: string | null;
  lineQuantities: Array<{ orderItemId: string; quantity: number }>;
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  ownerStaffId: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
  notes: string | null;
  createdAt: string;
  customer?: Ref;
  owner?: Ref;
  items?: LineItem[];
  deliveries?: Delivery[];
  invoices?: Invoice[];
  quotation?: { id: string; number: string } | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference: string | null;
  receivedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  orderId: string | null;
  status: string;
  issuedAt: string | null;
  dueAt: string | null;
  subtotal: number;
  taxAmt: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  createdAt: string;
  customer?: Ref;
  order?: {
    id: string;
    number: string;
    items?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmt: number;
      taxRate: number;
      lineTotal: number;
      sortOrder: number;
    }>;
  } | null;
  payments?: Payment[];
}

export interface SalesDashboard {
  kpis: {
    totalLeads: number;
    activeLeads: number;
    openQuotations: number;
    totalOrders: number;
    wonRevenue: number;
    outstanding: number;
    pipelineValue: number;
    conversionRate: number;
  };
  pipeline: {
    leads: Record<string, number>;
    quotations: Record<string, number>;
    orders: Record<string, number>;
  };
  revenueByMonth: Array<{ month: string; amount: number }>;
  salespeople: Array<{
    staffId: string;
    name: string;
    leads: number;
    quotations: number;
    orders: number;
    orderValue: number;
  }>;
  /** Today's operational snapshot. */
  today: {
    enquiries: number;
    followupsDue: number;
    followupsDone: number;
  };
  /** Enquiries registered today. */
  todayEnquiries: Array<{
    id: string;
    contactName: string;
    contactPhone: string | null;
    status: string;
    enquiryType: string | null;
    treatmentName: string | null;
    createdAt: string;
  }>;
  /** Follow-ups due today. */
  followupsDueToday: SalesFollowUp[];
}

/** The 360° history payload from GET /customers/[id]/sales. */
export interface CustomerSales {
  leads: Lead[];
  quotations: Quotation[];
  orders: SalesOrder[];
  invoices: Invoice[];
  summary: {
    leadCount: number;
    quotationCount: number;
    orderCount: number;
    invoiceCount: number;
    totalBilled: number;
    totalSpent: number;
    outstanding: number;
  };
}
