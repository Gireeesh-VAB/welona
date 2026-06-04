import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminLeaveTypeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Leave type name is required').max(80),
  code: z
    .string()
    .trim()
    .min(1, 'Short code is required')
    .max(8)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, _ or - only')
    .transform((s) => s.toUpperCase()),
  daysPerYear: z.coerce.number().min(0).max(365).default(0),
  paid: z.boolean().default(true),
  description: optionalText(300),
});

export const adminLeaveTypeUpdateSchema = adminLeaveTypeCreateSchema.partial();

export const adminLeaveTypeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type AdminLeaveTypeCreateInput = z.infer<typeof adminLeaveTypeCreateSchema>;
export type AdminLeaveTypeUpdateInput = z.infer<typeof adminLeaveTypeUpdateSchema>;
export type AdminLeaveTypeListQuery = z.infer<typeof adminLeaveTypeListQuerySchema>;
