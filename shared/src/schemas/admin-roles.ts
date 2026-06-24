import { z } from 'zod';

export const adminRoleCreateSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required').max(80),
  scope: z.enum(['organization', 'branch']),
  description: z.string().trim().max(300).optional().default(''),
  permissions: z.array(z.string()).default([]),
});

export const adminRoleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(z.string()).optional(),
});

export const adminRoleListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(100),
});

export type AdminRoleCreateInput = z.infer<typeof adminRoleCreateSchema>;
export type AdminRoleUpdateInput = z.infer<typeof adminRoleUpdateSchema>;
