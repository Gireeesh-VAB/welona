import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));

// ---------------------------------------------------------------------------
// Assignment (product + quantity)
// ---------------------------------------------------------------------------

export const complimentaryAssignmentSchema = z.object({
  productId: z.string().trim().min(1, 'Product is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
});

// ---------------------------------------------------------------------------
// Rule CRUD
// ---------------------------------------------------------------------------

export const adminComplimentaryRuleCreateSchema = z.object({
  name: z.string().trim().min(1, 'Rule name is required').max(120),
  description: optionalText(500),
  triggerServiceId: z.string().trim().min(1, 'Trigger service is required'),
  isActive: z.boolean().default(true),
  assignments: z
    .array(complimentaryAssignmentSchema)
    .min(1, 'At least one complimentary product is required'),
});

export const adminComplimentaryRuleUpdateSchema =
  adminComplimentaryRuleCreateSchema.partial();

export const adminComplimentaryRuleListQuerySchema = z.object({
  search: z.string().trim().optional(),
  triggerServiceId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type AdminComplimentaryRuleCreateInput = z.infer<
  typeof adminComplimentaryRuleCreateSchema
>;
export type AdminComplimentaryRuleUpdateInput = z.infer<
  typeof adminComplimentaryRuleUpdateSchema
>;
export type AdminComplimentaryRuleListQuery = z.infer<
  typeof adminComplimentaryRuleListQuerySchema
>;
