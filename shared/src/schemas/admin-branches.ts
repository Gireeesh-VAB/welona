import { z } from 'zod';
import { BRANCH_TYPES } from '../enums';
import { adminBranchAddressCreateSchema } from './admin-branch-addresses';

/**
 * Validation schemas for the admin-side branches CRUD (master data).
 * Mirrors the field list requested by the admin UI:
 *   branchName, branchCode, branchType, zone, address, phone, email, ipAddress.
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
  branchType: z.enum(BRANCH_TYPES).optional(),
  // The parent branch in the hierarchy. Omitted = unchanged; null / empty
  // string = clear (top-level). A non-empty string sets the parent.
  parentBranchId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  address: optionalText(300),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  ipAddress: ipv4.optional().or(z.literal('').transform(() => undefined)),
  loginPassword: z.string().trim().min(6, 'Password must be at least 6 characters').max(100).optional().or(z.literal('').transform(() => undefined)),
  stateId: z.string().optional(),
  isActive: z.boolean().optional(),
  additionalAddresses: z.array(adminBranchAddressCreateSchema).max(20).optional(),
});

export const adminBranchUpdateSchema = adminBranchCreateSchema
  .omit({ additionalAddresses: true })
  .partial();

export const adminBranchListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  // Callers fetch up to 200 for branch dropdowns; keep headroom like other lists.
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export type AdminBranchCreateInput = z.infer<typeof adminBranchCreateSchema>;
export type AdminBranchUpdateInput = z.infer<typeof adminBranchUpdateSchema>;
export type AdminBranchListQuery = z.infer<typeof adminBranchListQuerySchema>;
