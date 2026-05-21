import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

export const adminSystemUserCreateSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, 'User name is required')
    .max(80)
    .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dot, dash or underscore'),
  // Password required on create — the route hashes with bcrypt.
  password: z.string().min(6, 'Password must be at least 6 characters').max(80),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  employeeId: optionalText(60),
  branchId: optionalText(60),
});

export const adminSystemUserUpdateSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9._-]+$/, 'Use letters, digits, dot, dash or underscore')
    .optional(),
  // Password optional on update; only set when provided.
  password: z.string().min(6).max(80).optional().or(z.literal('').transform(() => undefined)),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  employeeId: optionalText(60),
  branchId: optionalText(60),
});

export const adminSystemUserListQuerySchema = z.object({
  search: z.string().trim().optional(),
  branchId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type AdminSystemUserCreateInput = z.infer<typeof adminSystemUserCreateSchema>;
export type AdminSystemUserUpdateInput = z.infer<typeof adminSystemUserUpdateSchema>;
export type AdminSystemUserListQuery = z.infer<typeof adminSystemUserListQuerySchema>;
