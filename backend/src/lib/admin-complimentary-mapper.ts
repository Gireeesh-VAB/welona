import type { Prisma } from '@prisma/client';
import type { AdminComplimentaryRule, BranchComplimentaryRule, AdminBranchComplimentaryLimit } from '@shared/types/admin-complimentary';

// ── Service Assignment Rule ──────────────────────────────────────────────────

export const complimentaryRuleInclude = {
  category: true,
  services: { include: { service: true } },
  branches: { include: { branch: true } },
  createdByAdmin: true,
} satisfies Prisma.ComplimentaryServiceRuleInclude;

export type ComplimentaryRuleWithRelations = Prisma.ComplimentaryServiceRuleGetPayload<{
  include: typeof complimentaryRuleInclude;
}>;

export function toAdminComplimentaryRule(row: ComplimentaryRuleWithRelations): AdminComplimentaryRule {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    isActive: row.isActive,
    services: row.services.map((s) => ({ id: s.serviceId, name: s.service.name })),
    branches: row.branches.map((b) => ({
      id: b.branchId,
      branchName: b.branch.name,
      branchCode: b.branch.code,
    })),
    createdBy: row.createdByAdmin
      ? { id: row.createdByAdmin.id, name: row.createdByAdmin.name, email: row.createdByAdmin.email }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const branchComplimentaryInclude = {
  category: true,
  services: { include: { service: { select: { id: true, name: true, minPrice: true, maxPrice: true } } } },
} satisfies Prisma.ComplimentaryServiceRuleInclude;

export type BranchComplimentaryWithRelations = Prisma.ComplimentaryServiceRuleGetPayload<{
  include: typeof branchComplimentaryInclude;
}>;

export function toBranchComplimentaryRule(row: BranchComplimentaryWithRelations): BranchComplimentaryRule {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    services: row.services.map((s) => ({
      id: s.serviceId,
      name: s.service.name,
      minPrice: s.service.minPrice,
      maxPrice: s.service.maxPrice,
    })),
  };
}

// ── Branch Complimentary Limit ───────────────────────────────────────────────

export const complimentaryLimitInclude = {
  branch: true,
} satisfies Prisma.BranchComplimentaryLimitInclude;

export type ComplimentaryLimitWithRelations = Prisma.BranchComplimentaryLimitGetPayload<{
  include: typeof complimentaryLimitInclude;
}>;

export function toAdminBranchComplimentaryLimit(row: ComplimentaryLimitWithRelations): AdminBranchComplimentaryLimit {
  return {
    id: row.id,
    branchId: row.branchId,
    branchName: row.branch.name,
    branchCode: row.branch.code,
    percentage: row.percentage,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
