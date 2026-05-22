/**
 * Enum-like value sets for the sales pipeline.
 *
 * SQLite has no native enum type, so these are stored as plain strings on the
 * Prisma models and constrained here by TypeScript const unions. Each array
 * also feeds `z.enum(...)` in the request schemas.
 */

/** Lead lifecycle (section: Sales pipeline). */
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'converted',
  'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Where a lead came from. */
export const LEAD_SOURCES = [
  'walk_in',
  'referral',
  'website',
  'phone',
  'social',
  'campaign',
  'other',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Quotation lifecycle. */
export const QUOTATION_STATUSES = [
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
  'converted',
] as const;
export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

/** Sales order lifecycle. */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'partially_delivered',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Delivery lifecycle. */
export const DELIVERY_STATUSES = [
  'scheduled',
  'dispatched',
  'delivered',
  'failed',
  'returned',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Invoice lifecycle. */
export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/** Payment status cached on orders and invoices. */
export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** How a payment was collected. */
export const PAYMENT_METHODS = [
  'cash',
  'card',
  'upi',
  'bank_transfer',
  'cheque',
  'wallet',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Customer kind. */
export const CUSTOMER_TYPES = ['individual', 'business'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

/** Follow-up task status for an enquiry. */
export const FOLLOWUP_STATUSES = ['pending', 'completed', 'cancelled'] as const;
export type FollowUpStatus = (typeof FOLLOWUP_STATUSES)[number];

// --- Cash management --------------------------------------------------------

/** Indian currency denominations (rupee value of each note/coin). */
export const CASH_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

/** Direction of a petty-cash entry. */
export const PETTY_CASH_DIRECTIONS = ['in', 'out'] as const;
export type PettyCashDirection = (typeof PETTY_CASH_DIRECTIONS)[number];

/** Accounting voucher types. */
export const VOUCHER_TYPES = ['payment', 'receipt', 'journal', 'contra'] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];

/** Voucher settlement mode. */
export const VOUCHER_MODES = ['cash', 'bank'] as const;
export type VoucherMode = (typeof VOUCHER_MODES)[number];

/** Outcome of a logged follow-up interaction. */
export const FOLLOWUP_OUTCOMES = [
  'interested',
  'not_interested',
  'no_response',
  'call_back',
  'converted',
  'other',
] as const;
export type FollowUpOutcome = (typeof FOLLOWUP_OUTCOMES)[number];

/** Gender options on an enquiry. */
export const GENDERS = ['male', 'female', 'others'] as const;
export type Gender = (typeof GENDERS)[number];

/**
 * Configurable dropdown lists, managed as master data in Settings and
 * selected when recording an enquiry.
 */
export const MASTER_OPTION_KINDS = ['enquiry_type', 'media', 'call_type'] as const;
export type MasterOptionKind = (typeof MASTER_OPTION_KINDS)[number];

// --- Customer relationship modules (Phase 2) --------------------------------

/** Booking lifecycle. */
export const BOOKING_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Package lifecycle. */
export const PACKAGE_STATUSES = ['active', 'completed', 'expired', 'cancelled'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

/** Offer lifecycle. */
export const OFFER_STATUSES = ['active', 'redeemed', 'expired', 'cancelled'] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

/** How an offer's discount is expressed. */
export const DISCOUNT_TYPES = ['percent', 'flat'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];
