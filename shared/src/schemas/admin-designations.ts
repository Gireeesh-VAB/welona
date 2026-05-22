import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

/**
 * Form input — the admin UI only asks for name + remarks. IP address and
 * creator are stamped automatically in the route handler.
 */
export const adminDesignationCreateSchema = z.object({
  name: z.string().trim().min(1, 'Designation name is required').max(80),
  remarks: optionalText(300),
});

export const adminDesignationUpdateSchema = adminDesignationCreateSchema.partial();

export const adminDesignationListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminDesignationCreateInput = z.infer<typeof adminDesignationCreateSchema>;
export type AdminDesignationUpdateInput = z.infer<typeof adminDesignationUpdateSchema>;
export type AdminDesignationListQuery = z.infer<typeof adminDesignationListQuerySchema>;
