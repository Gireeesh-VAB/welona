import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminCancellationCustomerCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  mobileNo: z.string().trim().min(1, 'Mobile number is required').max(40),
  gender: z.enum(['male', 'female', 'other']).optional(),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const adminCancellationCustomerUpdateSchema =
  adminCancellationCustomerCreateSchema.partial();

export const adminCancellationCustomerListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminCancellationCustomerCreateInput = z.infer<
  typeof adminCancellationCustomerCreateSchema
>;
export type AdminCancellationCustomerUpdateInput = z.infer<
  typeof adminCancellationCustomerUpdateSchema
>;
