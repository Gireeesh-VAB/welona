/**
 * Sales pipeline service helpers: document numbering, money/total
 * computation, and derived-status recomputation.
 *
 * The recompute helpers accept a `Prisma.TransactionClient` so they compose
 * inside `db.$transaction(...)`; the shared `db` client also satisfies it.
 */
import { Prisma } from '@prisma/client';

/** A Prisma client or an interactive-transaction client. */
export type Db = Prisma.TransactionClient;

// --- Document numbering -----------------------------------------------------

/**
 * Atomically produce the next human-readable document number for an org,
 * e.g. `QT-0001`. Must run inside a transaction to avoid duplicate numbers.
 */
export async function nextDocumentNumber(
  tx: Db,
  orgId: string,
  key: 'quotation' | 'order' | 'invoice' | 'voucher' | 'booking' | 'po' | 'grn' | 'transfer' | 'shipment' | 'indent' | 'rfq',
  prefix: string,
): Promise<string> {
  const counter = await tx.counter.upsert({
    where: { orgId_key: { orgId, key } },
    create: { orgId, key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${prefix}-${String(counter.value).padStart(4, '0')}`;
}

// --- Money / totals ---------------------------------------------------------

/** A line item as submitted by the client. */
export interface LineInput {
  description: string;
  productId?: string | null;
  quantity: number;
  /** Unit price in minor units. */
  unitPrice: number;
  /** Flat discount on the line, in minor units. */
  discountAmt?: number;
  /** Tax rate in basis points (1800 = 18%). */
  taxRate?: number;
}

/** A line item with computed totals, ready to persist. */
export interface ComputedLine {
  description: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  discountAmt: number;
  taxRate: number;
  lineTotal: number;
  sortOrder: number;
}

/**
 * Compute per-line and document totals (all in minor units).
 * `lineTotal` is the net taxable amount: `unitPrice * quantity - discountAmt`.
 */
export function computeTotals(items: LineInput[]) {
  let subtotal = 0;
  let taxAmt = 0;
  let discountAmt = 0;

  const lines: ComputedLine[] = items.map((it, index) => {
    const lineDiscount = it.discountAmt ?? 0;
    const taxRate = it.taxRate ?? 0;
    const lineTotal = it.unitPrice * it.quantity - lineDiscount;
    subtotal += lineTotal;
    taxAmt += Math.round((lineTotal * taxRate) / 10000);
    discountAmt += lineDiscount;
    return {
      description: it.description,
      productId: it.productId ?? null,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmt: lineDiscount,
      taxRate,
      lineTotal,
      sortOrder: index,
    };
  });

  return { lines, subtotal, taxAmt, discountAmt, total: subtotal + taxAmt };
}

// --- Derived status recomputation ------------------------------------------

/**
 * Recompute an order's cached `paymentStatus` from its non-void invoices.
 */
export async function recomputeOrderPaymentStatus(tx: Db, orderId: string): Promise<void> {
  const order = await tx.salesOrder.findUnique({
    where: { id: orderId },
    include: { invoices: true },
  });
  if (!order) return;

  const billed = order.invoices.filter((i) => i.status !== 'void');
  const totalPaid = billed.reduce((sum, i) => sum + i.amountPaid, 0);

  let paymentStatus: string = 'unpaid';
  if (totalPaid > 0 && totalPaid < order.total) paymentStatus = 'partially_paid';
  else if (order.total > 0 && totalPaid >= order.total) paymentStatus = 'paid';

  if (paymentStatus !== order.paymentStatus) {
    await tx.salesOrder.update({ where: { id: orderId }, data: { paymentStatus } });
  }
}

/**
 * Recompute an invoice's `amountPaid` and (paid) `status` from its payments,
 * then cascade to the linked order's payment status.
 */
export async function recomputeInvoice(tx: Db, invoiceId: string): Promise<void> {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) return;

  const amountPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

  // Draft and void invoices keep their status; issued invoices derive it.
  let status = invoice.status;
  if (status === 'issued' || status === 'partially_paid' || status === 'paid') {
    if (amountPaid <= 0) status = 'issued';
    else if (amountPaid < invoice.total) status = 'partially_paid';
    else status = 'paid';
  }

  await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid, status } });

  if (invoice.orderId) {
    await recomputeOrderPaymentStatus(tx, invoice.orderId);
  }
}

/**
 * Recompute an order's delivery `status` from how much of each line has been
 * delivered (`OrderItem.quantityDelivered`). Cancelled orders are left alone.
 */
export async function recomputeOrderDeliveryStatus(tx: Db, orderId: string): Promise<void> {
  const order = await tx.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.status === 'cancelled') return;

  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const deliveredQty = order.items.reduce((sum, i) => sum + i.quantityDelivered, 0);

  let status = order.status;
  if (deliveredQty <= 0) status = 'confirmed';
  else if (deliveredQty < totalQty) status = 'partially_delivered';
  else status = 'delivered';

  if (status !== order.status) {
    await tx.salesOrder.update({ where: { id: orderId }, data: { status } });
  }
}
