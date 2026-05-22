import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

/**
 * Form input — the admin UI only asks for name + remarks. IP address and
 * creator are stamped automatically in the route handler.
 */
export const adminDepartmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(80),
  remarks: optionalText(300),
});

export const adminDepartmentUpdateSchema = adminDepartmentCreateSchema.partial();

export const adminDepartmentListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminDepartmentCreateInput = z.infer<typeof adminDepartmentCreateSchema>;
export type AdminDepartmentUpdateInput = z.infer<typeof adminDepartmentUpdateSchema>;
export type AdminDepartmentListQuery = z.infer<typeof adminDepartmentListQuerySchema>;
