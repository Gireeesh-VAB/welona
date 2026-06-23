/**
 * Zod request schemas for the Phase 2 customer relationship modules:
 * Bookings, Packages, Offers, Prescriptions and Medical Reports.
 * Used with `parseBody` from src/lib/api/handler.ts.
 */
import { z } from 'zod';
import {
  BOOKING_STATUSES,
  DISCOUNT_TYPES,
  OFFER_STATUSES,
  PACKAGE_STATUSES,
  SESSION_STATUSES,
} from '@shared/enums';

const id = z.string().min(1);
/** Money / counts — non-negative integers. */
const nonNegInt = z.number().int().nonnegative();
const optionalText = z.string().trim().optional();

// --- Bookings ---------------------------------------------------------------

export const bookingCreateSchema = z.object({
  serviceName: z.string().trim().min(1, 'Service name is required'),
  scheduledAt: z.string().datetime(),
  status: z.enum(BOOKING_STATUSES).optional(),
  branchId: id.optional(),
  notes: optionalText,
  gstRateId: z.string().optional(),
});

export const bookingUpdateSchema = z.object({
  serviceName: z.string().trim().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  notes: optionalText,
});

/** A single service line on a booking. */
export const bookingItemSchema = z.object({
  category: optionalText,
  service: z.string().trim().min(1, 'Service is required'),
  quantity: z.number().int().positive().default(1),
  amount: nonNegInt.default(0), // unit amount, minor units
  isSessionBased: z.boolean().default(false),
  // Optional per-item tax — used for package items whose tax is configured at the package level
  taxPercent: z.number().int().min(0).max(100).optional(),
  taxType: z.enum(['inclusive', 'exclusive']).optional(),
  // Link to Package Session Master so extra products can be shown in the session modal
  packageSessionMasterId: z.string().optional(),
  isPackageSummaryLine: z.boolean().default(false),
});

/** Record a payment against a booking, optionally allocating to specific services. */
export const bookingPaySchema = z.object({
  paidAmount:  z.number().int().nonnegative(),
  paymentMode: z.string().trim().optional(),
  serviceAllocations: z.array(z.object({
    bookingItemId: z.string().min(1),
    amount:        z.number().int().nonnegative(),
  })).optional(),
});
export type BookingPayInput = z.infer<typeof bookingPaySchema>;

/** Create a full service appointment with consultant, line items and totals. */
export const appointmentCreateSchema = z.object({
  customerId: id,
  consultantStaffId: id.optional(),
  scheduledAt: z.string().datetime(),
  status: z.enum(BOOKING_STATUSES).optional(),
  branchId: id.optional(),
  notes: optionalText,
  discount: nonNegInt.default(0),
  roundOff: z.number().int().default(0),
  items: z.array(bookingItemSchema).min(1, 'Add at least one service'),
  /** When true, skip the insufficient-stock check and proceed anyway. */
  forceCreate: z.boolean().default(false),
  /** Per-service advance allocation for package items. serviceName → amountPaise. */
  packageServiceAllocations: z.array(z.object({
    serviceName: z.string(),
    amountPaise: z.number().int().nonnegative(),
  })).optional(),
});

// --- Packages ---------------------------------------------------------------

export const packageCreateSchema = z.object({
  name: z.string().trim().min(1, 'Package name is required'),
  masterId: id.optional(),
  treatmentId: id.optional(),
  totalSessions: z.number().int().positive('Total sessions must be at least 1'),
  usedSessions: nonNegInt.default(0),
  price: nonNegInt.default(0),
  purchasedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(PACKAGE_STATUSES).optional(),
  notes: optionalText,
});

export const packageUpdateSchema = z.object({
  name:          z.string().trim().min(1).optional(),
  treatmentId:   id.optional(),
  totalSessions: z.number().int().positive().optional(),
  // usedSessions is intentionally excluded — it is managed exclusively via
  // session entries (POST/PATCH /sessions) to maintain the audit trail.
  price:         nonNegInt.optional(),
  expiresAt:     z.string().datetime().optional(),
  status:        z.enum(PACKAGE_STATUSES).optional(),
  notes:         optionalText,
});

export const packageCheckoutSchema = z.object({
  name: z.string().trim().min(1, 'Package name is required'),
  masterId: id.optional(),
  totalSessions: z.number().int().positive('Total sessions must be at least 1'),
  price: nonNegInt.default(0),
  expiresAt: z.string().datetime().optional(),
  notes: optionalText,
  paidAmount: nonNegInt.default(0),
  paymentMethod: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'wallet']).default('cash'),
  paymentRef: optionalText,
});
export type PackageCheckoutInput = z.infer<typeof packageCheckoutSchema>;

// --- Session Entries --------------------------------------------------------

export const sessionEntryCreateSchema = z.object({
  bookingId:   id.optional(),
  sessionDate: z.string().min(1, 'Session date is required'),
  staffName:   optionalText,
  status:      z.enum(SESSION_STATUSES),
  remarks:     optionalText,
});

export const sessionEntryUpdateSchema = sessionEntryCreateSchema.partial();

export type SessionEntryCreateInput = z.infer<typeof sessionEntryCreateSchema>;
export type SessionEntryUpdateInput = z.infer<typeof sessionEntryUpdateSchema>;

// --- Offers -----------------------------------------------------------------

export const offerCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: optionalText,
  discountType: z.enum(DISCOUNT_TYPES).default('percent'),
  discountValue: nonNegInt.default(0),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  status: z.enum(OFFER_STATUSES).optional(),
});

export const offerUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: optionalText,
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  discountValue: nonNegInt.optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  status: z.enum(OFFER_STATUSES).optional(),
});

// --- Prescriptions ----------------------------------------------------------

export const prescriptionCreateSchema = z.object({
  prescribedBy: optionalText,
  diagnosis: optionalText,
  medications: optionalText,
  notes: optionalText,
  fileUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  issuedAt: z.string().datetime().optional(),
});

export const prescriptionUpdateSchema = prescriptionCreateSchema;

// --- Medical reports --------------------------------------------------------

export const medicalReportCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  reportType: optionalText,
  findings: optionalText,
  notes: optionalText,
  fileUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  reportedAt: z.string().datetime().optional(),
});

export const medicalReportUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  reportType: optionalText,
  findings: optionalText,
  notes: optionalText,
  fileUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  reportedAt: z.string().datetime().optional(),
});

// --- Feedback ---------------------------------------------------------------

export const feedbackCreateSchema = z.object({
  rating: z.number().int().min(1, 'Rating is required').max(5),
  comment: optionalText,
  relatedTo: optionalText,
});

// --- Documents --------------------------------------------------------------

export const documentCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  docType: optionalText,
  fileUrl: z.string().trim().url('Enter a valid URL').optional().or(z.literal('')),
  notes: optionalText,
  uploadedAt: z.string().datetime().optional(),
});
