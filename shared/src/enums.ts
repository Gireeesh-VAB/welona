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
  'transferred',
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

/** Whether a branch is company-owned or a franchise outlet. */
export const BRANCH_TYPES = ['company', 'franchise'] as const;
export type BranchType = (typeof BRANCH_TYPES)[number];

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

/** Individual session entry status within a package. */
export const SESSION_STATUSES = ['completed', 'no_show', 'cancelled', 'rescheduled'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** How an offer's discount is expressed. */
export const DISCOUNT_TYPES = ['percent', 'flat'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

// --- HR (Phase 1) -----------------------------------------------------------

/** Daily attendance status. `holiday` is auto-derived from the Holiday table. */
export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'half_day',
  'wfh',
  'leave',
  'holiday',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/** Leave application lifecycle. */
export const LEAVE_APPLICATION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;
export type LeaveApplicationStatus = (typeof LEAVE_APPLICATION_STATUSES)[number];

/** Holiday kind — used for filtering / colouring in the calendar. */
export const HOLIDAY_TYPES = ['public', 'regional', 'optional'] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

// --- Inventory --------------------------------------------------------------

/**
 * Inventory ledger movement kind. `opening` is a one-time setup write,
 * `purchase` adds stock, `sale` removes stock, `adjustment` corrects either
 * direction (sign on `delta` controls in/out).
 */
export const INVENTORY_MOVEMENT_TYPES = [
  'opening',
  'purchase',
  'sale',
  'adjustment',
  'transfer_in',
  'transfer_out',
  'service_consumption',
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const STOCK_INDENT_STATUSES = ['pending', 'approved', 'dispatched', 'delivered', 'closed', 'rejected'] as const;
export type StockIndentStatus = (typeof STOCK_INDENT_STATUSES)[number];

/** Procurement RFQ lifecycle. */
export const RFQ_STATUSES = ['draft', 'sent', 'comparing', 'ordered', 'cancelled'] as const;
export type RFQStatus = (typeof RFQ_STATUSES)[number];

/** Supplier quote status within an RFQ. */
export const SUPPLIER_QUOTE_STATUSES = ['pending', 'submitted', 'accepted', 'rejected'] as const;
export type SupplierQuoteStatus = (typeof SUPPLIER_QUOTE_STATUSES)[number];

/** Lifecycle states of a Purchase Order. */
export const PURCHASE_ORDER_STATUSES = [
  'draft',
  'sent',
  'partially_received',
  'received',
  'cancelled',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

/** Lifecycle states of an inter-branch Stock Transfer. */
export const STOCK_TRANSFER_STATUSES = [
  'requested',
  'dispatched',
  'received',
  'cancelled',
] as const;
export type StockTransferStatus = (typeof STOCK_TRANSFER_STATUSES)[number];

/** Stages of a tracked shipment. The first five form the linear pipeline;
 * `cancelled` is a terminal off-ramp reachable from any active stage. */
export const SHIPMENT_PIPELINE = ['ordered', 'in_transit', 'received', 'qc', 'stocked'] as const;
export const SHIPMENT_STAGES = [...SHIPMENT_PIPELINE, 'cancelled'] as const;
export type ShipmentStage = (typeof SHIPMENT_STAGES)[number];

/** Purchase / stock unit options — how a product is ordered and received. */
export const PRODUCT_UOMS = [
  'unit',
  'pack',
  'box',
  'bottle',
  'strip',
  'jar',
  'tube',
  'sachet',
  'roll',
  'bag',
  'ml',
  'litre',
  'gm',
  'kg',
] as const;
export type ProductUom = (typeof PRODUCT_UOMS)[number];

/**
 * Consumption unit options — the unit in which a product is actually used
 * during services/sessions (the "smallest unit"). When a product has a
 * `consumptionUom` set, stock is stored and deducted in this unit.
 */
export const CONSUMPTION_UOMS = [
  'unit',
  'ml',
  'litre',
  'gm',
  'kg',
  'tablet',
  'capsule',
  'piece',
  'sachet',
  'drop',
  'scoop',
  'puff',
  'strip',
  'application',
] as const;
export type ConsumptionUom = (typeof CONSUMPTION_UOMS)[number];
