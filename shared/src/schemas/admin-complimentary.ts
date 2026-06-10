import { z } from 'zod';

// ── Service Assignment Rule ──────────────────────────────────────────────────

export const adminComplimentaryRuleCreateSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  categoryId: z.string().trim().min(1, 'Category is required'),
  serviceIds: z.array(z.string().trim().min(1)).min(1, 'Select at least one service'),
  branchIds: z.array(z.string().trim().min(1)).min(1, 'Assign to at least one branch'),
  isActive: z.boolean().default(true),
});

export const adminComplimentaryRuleUpdateSchema =
  adminComplimentaryRuleCreateSchema.partial();

export const adminComplimentaryRuleListQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().optional(),
  branchId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export type AdminComplimentaryRuleCreateInput = z.infer<typeof adminComplimentaryRuleCreateSchema>;
export type AdminComplimentaryRuleUpdateInput = z.infer<typeof adminComplimentaryRuleUpdateSchema>;
export type AdminComplimentaryRuleListQuery = z.infer<typeof adminComplimentaryRuleListQuerySchema>;

// ── Branch Complimentary Limit ───────────────────────────────────────────────

export const adminBranchComplimentaryLimitUpsertSchema = z.object({
  branchId: z.string().trim().min(1, 'Branch is required'),
  percentage: z.coerce.number().int().min(0).max(100),
  isActive: z.boolean().default(true),
});

export const adminBranchComplimentaryLimitUpdateSchema = z.object({
  percentage: z.coerce.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type AdminBranchComplimentaryLimitUpsertInput = z.infer<typeof adminBranchComplimentaryLimitUpsertSchema>;
export type AdminBranchComplimentaryLimitUpdateInput = z.infer<typeof adminBranchComplimentaryLimitUpdateSchema>;
