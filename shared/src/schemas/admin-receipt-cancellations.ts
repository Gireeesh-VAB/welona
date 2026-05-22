import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminReceiptCancellationCreateSchema = z.object({
  branchId: optionalText(60),
  customerName: z.string().trim().min(1, 'Customer name is required').max(160),
  packageNo: optionalText(60),
  receiptNo: z.string().trim().min(1, 'Receipt number is required').max(60),
  paidAmount: z.coerce.number().int().nonnegative().default(0),
  remarks: optionalText(500),
  requestDate: z.string().min(1, 'Request date is required'),
});

export const adminReceiptCancellationUpdateSchema =
  adminReceiptCancellationCreateSchema.partial();

export const adminReceiptCancellationListQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminReceiptCancellationCreateInput = z.infer<
  typeof adminReceiptCancellationCreateSchema
>;
export type AdminReceiptCancellationUpdateInput = z.infer<
  typeof adminReceiptCancellationUpdateSchema
>;
