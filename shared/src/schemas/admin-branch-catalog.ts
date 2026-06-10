import { z } from 'zod';

/**
 * The set of master data a branch is assigned (availability toggle): products,
 * services, payment modes, categories and ledgers. The PUT replaces the
 * branch's whole assignment in one call.
 */
export const adminBranchCatalogSchema = z.object({
  productIds: z.array(z.string().min(1)).default([]),
  serviceIds: z.array(z.string().min(1)).default([]),
  paymentModeIds: z.array(z.string().min(1)).default([]),
  categoryIds: z.array(z.string().min(1)).default([]),
  ledgerIds: z.array(z.string().min(1)).default([]),
  complimentaryRuleIds: z.array(z.string().min(1)).default([]),
});

export type AdminBranchCatalogInput = z.infer<typeof adminBranchCatalogSchema>;
