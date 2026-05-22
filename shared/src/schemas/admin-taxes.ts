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

/**
 * The API stores the rate in basis points (1% = 100). The UI sends a decimal
 * percent (e.g. 2.5) and converts to bps before the request — this schema
 * accepts the integer bps form the server actually persists.
 */
export const adminTaxCreateSchema = z.object({
  name: z.string().trim().min(1, 'Tax name is required').max(60),
  percentBps: z.coerce.number().int().min(0).max(10000),
  remarks: optionalText(300),
  ipAddress: ipv4.optional().or(z.literal('').transform(() => undefined)),
  isActive: z.boolean().default(true),
});

export const adminTaxUpdateSchema = adminTaxCreateSchema.partial();

export const adminTaxListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminTaxCreateInput = z.infer<typeof adminTaxCreateSchema>;
export type AdminTaxUpdateInput = z.infer<typeof adminTaxUpdateSchema>;
export type AdminTaxListQuery = z.infer<typeof adminTaxListQuerySchema>;
