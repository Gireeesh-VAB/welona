import { z } from 'zod';

/**
 * Validation schemas for the Service master (admin module). Prices arrive
 * from the UI as whole rupees and are converted to integer paise by the
 * caller before persisting; the schema validates the raw numbers.
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminServiceCreateSchema = z
  .object({
    categoryId: z.string().min(1, 'Category is required'),
    name: z.string().trim().min(1, 'Service name is required').max(160),
    hsnSacCode: optionalText(20),
    minPrice: z.coerce.number().int().nonnegative().default(0),
    maxPrice: z.coerce.number().int().nonnegative().default(0),
    taxPercent: z.coerce.number().int().min(0).max(100).default(0),
    taxType: z.enum(['inclusive', 'exclusive']).default('exclusive'),
    hasMeasurements: z.boolean().default(false),
    hasComplementary: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.maxPrice >= v.minPrice, {
    message: 'Max price must be greater than or equal to min price',
    path: ['maxPrice'],
  });

export const adminServiceUpdateSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(160).optional(),
    hsnSacCode: optionalText(20),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    taxPercent: z.coerce.number().int().min(0).max(100).optional(),
    taxType: z.enum(['inclusive', 'exclusive']).optional(),
    hasMeasurements: z.boolean().optional(),
    hasComplementary: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.maxPrice === undefined || v.minPrice === undefined || v.maxPrice >= v.minPrice,
    {
      message: 'Max price must be greater than or equal to min price',
      path: ['maxPrice'],
    },
  );

export const adminServiceListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(10),
});

export type AdminServiceCreateInput = z.infer<typeof adminServiceCreateSchema>;
export type AdminServiceUpdateInput = z.infer<typeof adminServiceUpdateSchema>;
export type AdminServiceListQuery = z.infer<typeof adminServiceListQuerySchema>;
