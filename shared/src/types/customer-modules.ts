/**
 * UI-facing types for the Phase 2 customer relationship modules.
 * Money is integer minor units; dates are ISO strings.
 */

export interface Booking {
  id: string;
  customerId: string;
  branchId: string | null;
  number: string | null;
  serviceName: string;
  categoryName: string | null;
  scheduledAt: string;
  status: string;
  totalAmount: number;
  discount: number;
  roundOff: number;
  netAmount: number;
  paidAmount: number;
  notes: string | null;
  createdAt: string;
  gstRateId: string | null;
  taxableAmt: number;
  cgstPct: number;
  cgstAmt: number;
  sgstPct: number;
  sgstAmt: number;
  igstPct: number;
  igstAmt: number;
  taxType: string | null;
}

/** A service appointment in the calendar (a Booking with its customer name). */
export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  serviceName: string;
  categoryName: string | null;
  scheduledAt: string;
  status: string;
  netAmount: number;
  notes: string | null;
}

/** One service line on a booking. */
export interface BookingItem {
  category: string | null;
  service: string;
  quantity: number;
  amount: number;
  lineTotal: number;
}

/** Full appointment detail, for the receipt. */
export interface BookingDetail {
  id: string;
  number: string | null;
  customerName: string;
  customerPhone: string | null;
  consultantName: string | null;
  serviceName: string;
  scheduledAt: string;
  status: string;
  items: BookingItem[];
  totalAmount: number;
  discount: number;
  roundOff: number;
  netAmount: number;
  notes: string | null;
  createdAt: string;
}

export interface Package {
  id: string;
  customerId: string;
  branchId: string | null;
  treatmentId: string | null;
  name: string;
  totalSessions: number;
  usedSessions: number;
  price: number;
  purchasedAt: string;
  expiresAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

/** Package enriched with customer + branch data — returned by the sessions list endpoint. */
export interface PackageSession {
  id: string;
  orgId: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  branchId: string | null;
  branchName: string | null;
  name: string;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  price: number;
  purchasedAt: string;
  expiresAt: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

/** Individual session history entry within a package. */
export interface SessionEntry {
  id: string;
  packageId: string;
  bookingId: string | null;
  sessionNumber: number;
  sessionDate: string;
  staffName: string | null;
  status: string;
  remarks: string | null;
  createdAt: string;
}

/** Aggregate stats for the Session Management dashboard. */
export interface SessionStats {
  activePackages: number;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  todaySessions: number;
}

export interface Offer {
  id: string;
  customerId: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  redeemedAt: string | null;
  createdAt: string;
}

export interface Prescription {
  id: string;
  customerId: string;
  prescribedBy: string | null;
  diagnosis: string | null;
  medications: string | null;
  notes: string | null;
  fileUrl: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface MedicalReport {
  id: string;
  customerId: string;
  title: string;
  reportType: string | null;
  findings: string | null;
  notes: string | null;
  fileUrl: string | null;
  reportedAt: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  customerId: string;
  rating: number;
  comment: string | null;
  relatedTo: string | null;
  createdAt: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  title: string;
  docType: string | null;
  fileUrl: string | null;
  notes: string | null;
  uploadedAt: string;
  createdAt: string;
}

/** One entry in a customer's aggregated activity history. */
export interface HistoryEvent {
  id: string;
  /** Event category, e.g. booking | followup | order | enquiry. */
  type: string;
  title: string;
  detail: string | null;
  /** Display date — when the event occurred. */
  at: string;
  /** Sort key — when the record was logged. */
  sortAt: string;
}

