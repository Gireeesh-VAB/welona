/**
 * Shared Prisma `include` shapes for sales detail endpoints, so list and
 * detail responses stay consistent across routes.
 */
import { Prisma } from '@prisma/client';

const idName = { select: { id: true, name: true } };

/** Full quotation with items, customer, owner and links. */
export const quotationDetailInclude = {
  items: { orderBy: { sortOrder: 'asc' } },
  customer: idName,
  owner: idName,
  branch: idName,
  lead: { select: { id: true, contactName: true } },
  order: { select: { id: true, number: true, status: true } },
} satisfies Prisma.QuotationInclude;

/** Full sales order with items, deliveries and invoices. */
export const orderDetailInclude = {
  items: { orderBy: { sortOrder: 'asc' } },
  customer: idName,
  owner: idName,
  branch: idName,
  quotation: { select: { id: true, number: true } },
  deliveries: { orderBy: { createdAt: 'desc' } },
  invoices: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.SalesOrderInclude;

const orderItemSelect = {
  id: true, description: true, quantity: true,
  unitPrice: true, discountAmt: true, taxRate: true, lineTotal: true, sortOrder: true,
};

/** Full invoice with payments, order items and links. */
export const invoiceDetailInclude = {
  customer: idName,
  branch: idName,
  order: {
    select: {
      id: true,
      number: true,
      items: { select: orderItemSelect, orderBy: { sortOrder: 'asc' } },
    },
  },
  payments: { orderBy: { receivedAt: 'desc' } },
} satisfies Prisma.InvoiceInclude;
