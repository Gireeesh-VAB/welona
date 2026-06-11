import { z } from 'zod';

export const stockIndentCreateSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  requestedQty: z.coerce.number().int().positive('Must be at least 1'),
  reason: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const stockIndentUpdateSchema = z.object({
  status: z.enum(['approved', 'rejected', 'fulfilled']),
  notes: z.string().trim().max(500).optional(),
});

export const stockIndentListQuerySchema = z.object({
  branchId: z.string().optional(),
  productId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'fulfilled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type StockIndentCreateInput = z.infer<typeof stockIndentCreateSchema>;
export type StockIndentUpdateInput = z.infer<typeof stockIndentUpdateSchema>;
export type StockIndentListQuery = z.infer<typeof stockIndentListQuerySchema>;
