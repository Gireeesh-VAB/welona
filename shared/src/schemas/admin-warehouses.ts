import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminWarehouseCreateSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  name: z.string().trim().min(1, 'Warehouse name is required').max(120),
  code: z
    .string()
    .trim()
    .min(1, 'Warehouse code is required')
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, dash or underscore only'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const adminWarehouseUpdateSchema = z.object({
  name: optionalText(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, dash or underscore only')
    .optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const adminWarehouseListQuerySchema = z.object({
  branchId: z.string().optional(),
  search: z.string().trim().optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type AdminWarehouseCreateInput = z.infer<typeof adminWarehouseCreateSchema>;
export type AdminWarehouseUpdateInput = z.infer<typeof adminWarehouseUpdateSchema>;
export type AdminWarehouseListQuery = z.infer<typeof adminWarehouseListQuerySchema>;
