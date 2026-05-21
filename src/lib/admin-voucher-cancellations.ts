import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminVoucherCancellationCreateSchema = z.object({
  branchId: optionalText(60),
  expenseType: z.string().trim().min(1, 'Expense type is required').max(120),
  amount: z.coerce.number().int().nonnegative().default(0),
  remarks: optionalText(500),
  cancelReason: optionalText(300),
  requestDate: z.string().optional(),
});

export const adminVoucherCancellationUpdateSchema =
  adminVoucherCancellationCreateSchema.partial();

export const adminVoucherCancellationListQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().optional(),
  expenseType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminVoucherCancellationCreateInput = z.infer<
  typeof adminVoucherCancellationCreateSchema
>;
export type AdminVoucherCancellationUpdateInput = z.infer<
  typeof adminVoucherCancellationUpdateSchema
>;
