import { z } from 'zod';
import { PURCHASE_ORDER_STATUSES, PO_PAYMENT_STATUSES, PO_PAYMENT_METHODS } from '../enums';

/**
 * Validation for Purchase Orders + Goods Receipts (procurement).
 * Money fields are integer paise; tax rates basis points (1800 = 18%).
 */

const poItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.coerce.number().int().min(0).default(0),
  taxRate: z.coerce.number().int().min(0).max(10000).default(0),
});

export const adminPurchaseOrderCreateSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  expectedAt: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  items: z.array(poItemSchema).min(1, 'Add at least one line item'),
  fromIndentIds: z.array(z.string().min(1)).optional(),
});

export const adminPurchaseOrderUpdateSchema = z.object({
  status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
  expectedAt: z.string().datetime().nullable().optional().or(z.literal('').transform(() => null)),
  notes: z.string().trim().max(500).nullable().optional().or(z.literal('').transform(() => null)),
  paymentStatus: z.enum(PO_PAYMENT_STATUSES).optional(),
  paymentDate: z.string().datetime().nullable().optional().or(z.literal('').transform(() => null)),
  paymentMethod: z.enum(PO_PAYMENT_METHODS).nullable().optional(),
  amountPaid: z.coerce.number().int().min(0).nullable().optional(),
  paymentReference: z.string().trim().max(200).nullable().optional().or(z.literal('').transform(() => null)),
});

export const adminPurchaseOrderListQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

const grnItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  damagedQty: z.coerce.number().int().min(0).default(0),
  // Batch fields — required by the route for batch-tracked products.
  batchNo: z.string().trim().max(60).optional().or(z.literal('').transform(() => undefined)),
  mfgDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  expiryDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
});

export const adminGoodsReceiptCreateSchema = z.object({
  // poId drives branch/supplier when present; otherwise branchId is required.
  poId: z.string().min(1).optional(),
  branchId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  receivedAt: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  invoiceNumber: z.string().trim().max(100).optional().or(z.literal('').transform(() => undefined)),
  invoiceDate: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  invoiceAmount: z.coerce.number().int().min(0).optional(),
  items: z.array(grnItemSchema).min(1, 'Add at least one line item'),
});

export const adminGoodsReceiptListQuerySchema = z.object({
  branchId: z.string().optional(),
  poId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export const adminGoodsReceiptUpdateSchema = z.object({
  invoiceNumber: z.string().trim().max(100).nullable().optional().or(z.literal('').transform(() => null)),
  invoiceDate: z.string().datetime().nullable().optional().or(z.literal('').transform(() => null)),
  invoiceAmount: z.coerce.number().int().min(0).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional().or(z.literal('').transform(() => null)),
});

export type AdminPurchaseOrderCreateInput = z.infer<typeof adminPurchaseOrderCreateSchema>;
export type AdminPurchaseOrderUpdateInput = z.infer<typeof adminPurchaseOrderUpdateSchema>;
export type AdminPurchaseOrderListQuery = z.infer<typeof adminPurchaseOrderListQuerySchema>;
export type AdminGoodsReceiptCreateInput = z.infer<typeof adminGoodsReceiptCreateSchema>;
export type AdminGoodsReceiptUpdateInput = z.infer<typeof adminGoodsReceiptUpdateSchema>;
export type AdminGoodsReceiptListQuery = z.infer<typeof adminGoodsReceiptListQuerySchema>;
