import { z } from 'zod';
import { PRODUCT_UOMS } from '../enums';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminProductCreateSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  name: z.string().trim().min(1, 'Product name is required').max(160),
  brand: optionalText(80),
  categoryId: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  hsnSacCode: optionalText(20),
  uom: z.enum(PRODUCT_UOMS).default('unit'),
  barcode: optionalText(60),
  description: optionalText(500),
  /** Prices are stored as integer paise (rupees * 100). */
  mrp: z.coerce.number().int().min(0).default(0),
  salePrice: z.coerce.number().int().min(0).default(0),
  purchasePrice: z.coerce.number().int().min(0).default(0),
  /** Tax in basis points — 1800 = 18%. */
  taxPercent: z.coerce.number().int().min(0).max(10000).default(0),
  /** Units — drives the low-stock warning on the inventory page. */
  reorderLevel: z.coerce.number().int().min(0).default(0),
  /** Product photo as a data URL or external URL. Empty string clears it. */
  imageUrl: z
    .string()
    .trim()
    .max(2_000_000)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  trackBatches: z.boolean().default(false),
  trackExpiry: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const adminProductUpdateSchema = adminProductCreateSchema.partial();

export const adminProductListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;
