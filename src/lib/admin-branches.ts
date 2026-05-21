import { z } from 'zod';

/**
 * Validation schemas for the admin-side branches CRUD (master data).
 * Mirrors the field list requested by the admin UI:
 *   branchName, branchCode, zone, address, phone, email, ipAddress.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal('').transform(() => undefined));

const ipv4 = z
  .string()
  .trim()
  .regex(
    /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
    'Enter a valid IPv4 address (e.g. 192.168.1.10)',
  );

export const adminBranchCreateSchema = z.object({
  branchName: z.string().trim().min(1, 'Branch name is required').max(120),
  branchCode: z
    .string()
    .trim()
    .min(1, 'Branch code is required')
    .max(40)
    // Codes are short identifiers — letters, digits, dash, underscore.
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, digits, dash or underscore only'),
  zoneId: z.string().min(1, 'Zone is required'),
  address: optionalText(300),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  ipAddress: ipv4.optional().or(z.literal('').transform(() => undefined)),
});

export const adminBranchUpdateSchema = adminBranchCreateSchema.partial();

export const adminBranchListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AdminBranchCreateInput = z.infer<typeof adminBranchCreateSchema>;
export type AdminBranchUpdateInput = z.infer<typeof adminBranchUpdateSchema>;
export type AdminBranchListQuery = z.infer<typeof adminBranchListQuerySchema>;
