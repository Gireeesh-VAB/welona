import { z } from 'zod';
import { RFQ_STATUSES } from '../enums';

export const rfqCreateSchema = z.object({
  reason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
  indentId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    requiredQty: z.coerce.number().int().positive(),
  })).min(1, 'At least one product is required'),
});
export type RFQCreateInput = z.infer<typeof rfqCreateSchema>;

export const rfqUpdateSchema = z.object({
  status: z.enum(RFQ_STATUSES).optional(),
  reason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const supplierQuoteUpsertSchema = z.object({
  supplierId: z.string().min(1),
  validUntil: z.string().datetime({ offset: true }).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    unitPrice: z.coerce.number().int().min(0),
    deliveryDays: z.coerce.number().int().min(1).max(365),
    moq: z.coerce.number().int().min(1).optional(),
    notes: z.string().trim().max(300).optional(),
  })).min(1),
});
export type SupplierQuoteUpsertInput = z.infer<typeof supplierQuoteUpsertSchema>;

export const rfqListQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});
