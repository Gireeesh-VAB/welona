import { z } from 'zod';

/** Validation for inter-branch stock transfers. */

const transferItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
});

export const adminStockTransferCreateSchema = z
  .object({
    fromBranchId: z.string().min(1, 'Source branch is required'),
    toBranchId: z.string().min(1, 'Destination branch is required'),
    notes: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
    items: z.array(transferItemSchema).min(1, 'Add at least one line item'),
  })
  .refine((v) => v.fromBranchId !== v.toBranchId, {
    message: 'Source and destination branches must differ',
    path: ['toBranchId'],
  });

/** Lifecycle action on an existing transfer. */
export const adminStockTransferActionSchema = z.object({
  action: z.enum(['dispatch', 'receive', 'cancel']),
});

export const adminStockTransferListQuerySchema = z.object({
  branchId: z.string().optional(),
  status: z.enum(['requested', 'dispatched', 'received', 'cancelled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type AdminStockTransferCreateInput = z.infer<typeof adminStockTransferCreateSchema>;
export type AdminStockTransferActionInput = z.infer<typeof adminStockTransferActionSchema>;
export type AdminStockTransferListQuery = z.infer<typeof adminStockTransferListQuerySchema>;
