/**
 * Zod request schemas for the sales pipeline API.
 * Used with `parseBody` / `parseQuery` from src/lib/api/handler.ts.
 */
import { z } from 'zod';
import {
  CUSTOMER_TYPES,
  DELIVERY_STATUSES,
  FOLLOWUP_OUTCOMES,
  FOLLOWUP_STATUSES,
  GENDERS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  MASTER_OPTION_KINDS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
} from '@/lib/enums';

const id = z.string().min(1);
/** Money in minor units (paise) — non-negative integer. */
const money = z.number().int().nonnegative();
/** Optional email that also tolerates an empty string. */
const optionalEmail = z.string().email().optional().or(z.literal(''));

/** Common list query: pagination, search and an optional status filter. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  branchId: id.optional(),
  ownerStaffId: id.optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

// --- Customers --------------------------------------------------------------

export const customerCreateSchema = z.object({
  type: z.enum(CUSTOMER_TYPES).default('individual'),
  name: z.string().trim().min(1, 'Name is required'),
  email: optionalEmail,
  phone: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  gstin: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  branchId: id.optional(),
  tags: z.array(z.string().trim()).optional(),
  /** Profile photo as a data URL. */
  avatarUrl: z.string().optional(),
});
export const customerUpdateSchema = customerCreateSchema.partial();

// --- Line items (shared by quotations and orders) ---------------------------

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  productId: id.optional(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: money,
  discountAmt: money.default(0),
  /** Tax rate in basis points (1800 = 18%). */
  taxRate: z.number().int().min(0).max(10000).default(0),
});
export type LineItemInput = z.infer<typeof lineItemSchema>;

// --- Leads ------------------------------------------------------------------

export const leadCreateSchema = z.object({
  contactName: z.string().trim().min(1, 'Name is required'),
  contactPhone: z.string().trim().min(1, 'Mobile number is required'),
  contactEmail: optionalEmail,
  gender: z.enum(GENDERS).optional(),
  enquiryType: z.string().trim().optional(),
  treatmentId: id.optional(),
  media: z.string().trim().optional(),
  callType: z.string().trim().optional(),
  healthStatus: z.string().trim().optional(),
  leadTransfer: z.boolean().optional(),
  source: z.enum(LEAD_SOURCES).default('other'),
  interest: z.string().trim().optional(),
  estimatedValue: money.optional(),
  /** "Follow-Up By" — defaults to the current user when omitted. */
  ownerStaffId: id.optional(),
  customerId: id.optional(),
  branchId: id.optional(),
  notes: z.string().trim().optional(),
});
export const leadUpdateSchema = leadCreateSchema.partial();

export const leadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES),
  lostReason: z.string().trim().optional(),
});

// --- Master options (configurable dropdowns) -------------------------------

export const masterOptionCreateSchema = z.object({
  kind: z.enum(MASTER_OPTION_KINDS),
  label: z.string().trim().min(1, 'Label is required'),
  sortOrder: z.number().int().optional(),
});

export const masterOptionUpdateSchema = z.object({
  label: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const masterOptionQuerySchema = z.object({
  kind: z.enum(MASTER_OPTION_KINDS),
});

// --- Treatments (master data) ----------------------------------------------

export const treatmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  category: z.string().trim().optional(),
  description: z.string().trim().optional(),
  durationMinutes: z.number().int().positive().optional(),
  price: money.optional(),
});

export const treatmentUpdateSchema = treatmentCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// --- Follow-ups -------------------------------------------------------------

/**
 * A logged follow-up interaction. At least one of `note` (call discussion
 * notes) or `contactedAt` must be provided so the entry records something.
 */
export const followUpCreateSchema = z
  .object({
    contactedAt: z.string().datetime().optional(),
    dueAt: z.string().datetime().optional(),
    note: z.string().trim().optional(),
    remarks: z.string().trim().optional(),
    status: z.enum(FOLLOWUP_STATUSES).optional(),
    outcome: z.enum(FOLLOWUP_OUTCOMES).optional(),
    assignedToId: id.optional(),
  })
  .refine((v) => !!v.note || !!v.contactedAt, {
    message: 'Add discussion notes or a contacted date',
    path: ['note'],
  });

export const followUpUpdateSchema = z.object({
  status: z.enum(FOLLOWUP_STATUSES).optional(),
  contactedAt: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
  note: z.string().trim().optional(),
  remarks: z.string().trim().optional(),
  outcome: z.enum(FOLLOWUP_OUTCOMES).optional(),
  assignedToId: id.optional(),
});

// --- Quotations -------------------------------------------------------------

export const quotationCreateSchema = z.object({
  customerId: id,
  leadId: id.optional(),
  ownerStaffId: id,
  branchId: id.optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

export const quotationUpdateSchema = z.object({
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  ownerStaffId: id.optional(),
  items: z.array(lineItemSchema).min(1).optional(),
});

export const quotationRejectSchema = z.object({
  reason: z.string().trim().min(1, 'A rejection reason is required'),
});

// --- Sales orders -----------------------------------------------------------

export const orderCreateSchema = z.object({
  customerId: id,
  ownerStaffId: id,
  branchId: id.optional(),
  notes: z.string().trim().optional(),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

/** Editable order fields — salesperson reassignment and notes. */
export const orderUpdateSchema = z.object({
  ownerStaffId: id.optional(),
  notes: z.string().trim().optional(),
});

/**
 * Unified "New Sale": creates a confirmed order in one step, optionally
 * raising an issued invoice for it.
 */
export const quickSaleSchema = z.object({
  customerId: id,
  ownerStaffId: id,
  branchId: id.optional(),
  notes: z.string().trim().optional(),
  createInvoice: z.boolean().default(true),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
});

// --- Deliveries -------------------------------------------------------------

export const deliveryCreateSchema = z.object({
  scheduledFor: z.string().datetime().optional(),
  trackingRef: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  /** Quantity delivered per order line. */
  lines: z
    .array(z.object({ orderItemId: id, quantity: z.number().int().positive() }))
    .min(1, 'Specify at least one line'),
});

export const deliveryStatusSchema = z.object({
  status: z.enum(DELIVERY_STATUSES),
});

// --- Invoices & payments ----------------------------------------------------

export const invoiceCreateSchema = z.object({
  customerId: id,
  orderId: id.optional(),
  branchId: id.optional(),
  dueAt: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  /** Optional — if omitted and `orderId` is given, lines are copied from the order. */
  items: z.array(lineItemSchema).optional(),
});

export const paymentCreateSchema = z.object({
  amount: money.refine((v) => v > 0, 'Amount must be greater than zero'),
  method: z.enum(PAYMENT_METHODS).default('cash'),
  reference: z.string().trim().optional(),
  receivedAt: z.string().datetime().optional(),
});
