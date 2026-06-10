import type { Prisma } from '@prisma/client';
import type { AdminCoupon } from '@shared/types/admin-coupon';

export const couponAdminInclude = {
  createdBy: true,
  branches: { include: { branch: true } },
} satisfies Prisma.CouponInclude;

export type CouponWithRelations = Prisma.CouponGetPayload<{
  include: typeof couponAdminInclude;
}>;

export function toAdminCoupon(row: CouponWithRelations): AdminCoupon {
  return {
    id: row.id,
    couponName: row.couponName,
    couponCode: row.couponCode,
    couponType: row.couponType as 'percentage' | 'fixed',
    couponValue: row.couponValue,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    isActive: row.isActive,
    allBranches: row.allBranches,
    branches: row.branches.map((b) => ({
      id: b.branch.id,
      branchName: b.branch.name,
      branchCode: b.branch.code,
    })),
    createdBy: row.createdBy
      ? { id: row.createdBy.id, name: row.createdBy.name, email: row.createdBy.email }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
