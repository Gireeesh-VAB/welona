import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminPackageCancellationCreateSchema = z.object({
  branchId: optionalText(60),
  customerName: z.string().trim().min(1, 'Customer name is required').max(160),
  packageNo: z.string().trim().min(1, 'Package number is required').max(60),
  // amount: rupees from UI, converted to paise before sending.
  amount: z.coerce.number().int().nonnegative().default(0),
  remarks: optionalText(500),
  requestedDate: z.string().min(1, 'Requested date is required'),
});

export const adminPackageCancellationUpdateSchema =
  adminPackageCancellationCreateSchema.partial();

export const adminPackageCancellationListQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminPackageCancellationCreateInput = z.infer<
  typeof adminPackageCancellationCreateSchema
>;
export type AdminPackageCancellationUpdateInput = z.infer<
  typeof adminPackageCancellationUpdateSchema
>;
