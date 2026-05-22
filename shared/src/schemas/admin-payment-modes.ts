import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

const ipv4 = z
  .string()
  .trim()
  .regex(
    /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
    'Enter a valid IPv4 address',
  );

export const adminPaymentModeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  remarks: optionalText(300),
  ipAddress: ipv4.optional().or(z.literal('').transform(() => undefined)),
  isActive: z.boolean().default(true),
});

export const adminPaymentModeUpdateSchema = adminPaymentModeCreateSchema.partial();

export const adminPaymentModeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  active: z.enum(['all', 'active', 'inactive']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminPaymentModeCreateInput = z.infer<typeof adminPaymentModeCreateSchema>;
export type AdminPaymentModeUpdateInput = z.infer<typeof adminPaymentModeUpdateSchema>;
export type AdminPaymentModeListQuery = z.infer<typeof adminPaymentModeListQuerySchema>;
