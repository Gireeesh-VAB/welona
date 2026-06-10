import { z } from 'zod';

export const adminStateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  isActive: z.boolean().default(true),
});

export const adminStateUpdateSchema = adminStateCreateSchema.partial();
export const adminStateListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type AdminStateCreateInput = z.infer<typeof adminStateCreateSchema>;
