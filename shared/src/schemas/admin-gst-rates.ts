import { z } from 'zod';

export const adminGstRateCreateSchema = z.object({
  name: z.string().min(1).max(60),
  percentage: z.number().int().min(0).max(100),
  taxType: z.enum(['inclusive', 'exclusive']).default('exclusive'),
  isActive: z.boolean().default(true),
});

export const adminGstRateUpdateSchema = adminGstRateCreateSchema.partial();
export const adminGstRateListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export type AdminGstRateCreateInput = z.infer<typeof adminGstRateCreateSchema>;
