import { z } from 'zod';

/**
 * Validation schemas for the Zone master-data resource (admin module).
 */
export const zoneCreateSchema = z.object({
  country: z.string().trim().min(1, 'Country is required').max(80),
  stateName: z.string().trim().min(1, 'State name is required').max(120),
  remarks: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
});

export const zoneUpdateSchema = zoneCreateSchema.partial();

export const zoneListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ZoneCreateInput = z.infer<typeof zoneCreateSchema>;
export type ZoneUpdateInput = z.infer<typeof zoneUpdateSchema>;
export type ZoneListQuery = z.infer<typeof zoneListQuerySchema>;
