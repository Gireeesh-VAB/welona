/**
 * Stage state machines for the sales pipeline.
 *
 * Each map lists the statuses a record may move to from its current status.
 * `assertTransition` rejects illegal jumps so the pipeline stays coherent.
 */
import { Errors } from '@/lib/api/errors';

type Machine = Record<string, readonly string[]>;

/** Lead: new → contacted → qualified → (converted | unqualified | lost). */
export const LEAD_TRANSITIONS: Machine = {
  new: ['contacted', 'qualified', 'unqualified', 'lost'],
  contacted: ['qualified', 'unqualified', 'lost'],
  qualified: ['converted', 'unqualified', 'lost'],
  unqualified: ['contacted'],
  converted: [],
  lost: [],
};

/** Quotation: draft → sent → (approved | rejected | expired) → converted. */
export const QUOTATION_TRANSITIONS: Machine = {
  draft: ['sent'],
  sent: ['approved', 'rejected', 'expired'],
  approved: ['converted'],
  rejected: [],
  expired: ['sent'],
  converted: [],
};

/** Sales order: pending → confirmed → partially_delivered → delivered. */
export const ORDER_TRANSITIONS: Machine = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['partially_delivered', 'delivered', 'cancelled'],
  partially_delivered: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/** Delivery: scheduled → dispatched → (delivered | failed | returned). */
export const DELIVERY_TRANSITIONS: Machine = {
  scheduled: ['dispatched', 'failed'],
  dispatched: ['delivered', 'failed', 'returned'],
  delivered: ['returned'],
  failed: ['scheduled'],
  returned: [],
};

/** Invoice: draft → issued → partially_paid → paid (paid statuses are derived). */
export const INVOICE_TRANSITIONS: Machine = {
  draft: ['issued', 'void'],
  issued: ['partially_paid', 'paid', 'void'],
  partially_paid: ['paid', 'void'],
  paid: [],
  void: [],
};

/**
 * Throw `BAD_REQUEST` if `to` is not reachable from `from`.
 * A no-op transition (`from === to`) is allowed and silently ignored.
 */
export function assertTransition(
  machine: Machine,
  from: string,
  to: string,
  label = 'record',
): void {
  if (from === to) return;
  const allowed = machine[from] ?? [];
  if (!allowed.includes(to)) {
    throw Errors.badRequest(`Cannot change ${label} status from "${from}" to "${to}".`);
  }
}
