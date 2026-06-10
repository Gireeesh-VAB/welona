import type { Prisma } from '@prisma/client';
import type { AdminComplimentaryRule } from '@shared/types/admin-complimentary';

export const complimentaryRuleInclude = {
  triggerService: { include: { category: true } },
  assignments: { include: { product: true } },
  createdByAdmin: true,
} satisfies Prisma.ComplimentaryRuleInclude;

export type ComplimentaryRuleWithRelations = Prisma.ComplimentaryRuleGetPayload<{
  include: typeof complimentaryRuleInclude;
}>;

export function toAdminComplimentaryRule(
  row: ComplimentaryRuleWithRelations,
): AdminComplimentaryRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerServiceId: row.triggerServiceId,
    triggerServiceName: row.triggerService.name,
    triggerCategoryName: row.triggerService.category?.name ?? null,
    isActive: row.isActive,
    assignments: row.assignments.map((a) => ({
      id: a.id,
      productId: a.productId,
      productName: a.product.name,
      productSku: a.product.sku,
      quantity: a.quantity,
    })),
    createdBy: row.createdByAdmin
      ? {
          id: row.createdByAdmin.id,
          name: row.createdByAdmin.name,
          email: row.createdByAdmin.email,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
