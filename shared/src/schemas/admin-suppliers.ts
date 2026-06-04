import { z } from 'zod';

/**
 * Validation schemas for the admin-side suppliers CRUD (procurement master).
 * Mirrors the product master shape: globally-unique `code`, the rest optional.
 */
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminSupplierCreateSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(160),
  code: z
    .string()
    .trim()
    .min(1, 'Supplier code is required')
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, dash or underscore only'),
  contactPerson: optionalText(120),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  gstin: optionalText(20),
  address: optionalText(300),
  paymentTerms: optionalText(80),
  isActive: z.boolean().default(true),
});

export const adminSupplierUpdateSchema = adminSupplierCreateSchema.partial();

export const adminSupplierListQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type AdminSupplierCreateInput = z.infer<typeof adminSupplierCreateSchema>;
export type AdminSupplierUpdateInput = z.infer<typeof adminSupplierUpdateSchema>;
export type AdminSupplierListQuery = z.infer<typeof adminSupplierListQuerySchema>;
