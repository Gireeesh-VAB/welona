import { z } from 'zod';
import { INVENTORY_MOVEMENT_TYPES } from '../enums';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

/** List stock for a given branch (optionally filtered by product search). */
export const adminInventoryStockQuerySchema = z.object({
  branchId: z.string().min(1, 'branchId is required'),
  /** Optional — drill into one warehouse; omitted = branch-wide rollup. */
  warehouseId: z.string().optional(),
  search: z.string().trim().optional(),
  /** When true, return only products at/below their reorder level. */
  lowStockOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

/** Record one stock movement. `delta` is signed; reject zero. */
export const adminInventoryMovementCreateSchema = z.object({
  branchId: z.string().min(1),
  /** Optional — defaults to the branch's default warehouse. */
  warehouseId: z.string().optional(),
  productId: z.string().min(1),
  type: z.enum(INVENTORY_MOVEMENT_TYPES),
  delta: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, { message: 'delta cannot be zero' }),
  reason: optionalText(300),
  ref: optionalText(80),
});

export const adminInventoryMovementListQuerySchema = z.object({
  branchId: z.string().optional(),
  warehouseId: z.string().optional(),
  productId: z.string().optional(),
  type: z.enum(INVENTORY_MOVEMENT_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
});

/** Bulk opening-stock — set a starting quantity for many products at once. */
export const adminInventoryOpeningStockSchema = z.object({
  branchId: z.string().min(1),
  /** Optional — defaults to the branch's default warehouse. */
  warehouseId: z.string().optional(),
  entries: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(0),
      }),
    )
    .min(1)
    .max(500),
});

export type AdminInventoryStockQuery = z.infer<typeof adminInventoryStockQuerySchema>;
export type AdminInventoryMovementCreateInput = z.infer<typeof adminInventoryMovementCreateSchema>;
export type AdminInventoryMovementListQuery = z.infer<typeof adminInventoryMovementListQuerySchema>;
export type AdminInventoryOpeningStockInput = z.infer<typeof adminInventoryOpeningStockSchema>;
