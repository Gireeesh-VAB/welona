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
});

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
});

// --- Packages ---------------------------------------------------------------

export const packageCreateSchema = z.object({
  name: z.string().trim().min(1, 'Package name is required'),
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
  name: z.string().trim().min(1).optional(),
  treatmentId: id.optional(),
  totalSessions: z.number().int().positive().optional(),
  usedSessions: nonNegInt.optional(),
  price: nonNegInt.optional(),
  expiresAt: z.string().datetime().optional(),
  status: z.enum(PACKAGE_STATUSES).optional(),
  notes: optionalText,
});

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
