import { Prisma } from '@prisma/client';
import type { AdminUser, Branch, BranchAddress, Zone } from '@prisma/client';
import type { AdminBranch } from '@shared/types/admin-branch';
import type { AdminBranchAddress } from '@shared/types/admin-branch-address';
import { BRANCH_TYPES, type BranchType } from '@shared/enums';

/**
 * The relation set every admin branch endpoint loads so `toAdminBranch` has
 * everything it needs (zone, creator, addresses, parent, child count).
 */
export const branchAdminInclude = {
  zone: true,
  createdByAdmin: true,
  addresses: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
  parent: { select: { id: true, name: true, code: true } },
  _count: { select: { children: true } },
} satisfies Prisma.BranchInclude;

/** Branch with the relations the admin UI needs. */
export type BranchWithAdminRelations = Branch & {
  zone: Zone | null;
  createdByAdmin: AdminUser | null;
  addresses?: BranchAddress[];
  parent?: Pick<Branch, 'id' | 'name' | 'code'> | null;
  _count?: { children: number };
};

export function toAdminBranchAddress(row: BranchAddress): AdminBranchAddress {
  return {
    id: row.id,
    branchId: row.branchId,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    phone: row.phone,
    email: row.email,
    isPrimary: row.isPrimary,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Map a Prisma Branch (with relations) to the admin-side DTO shape. */
export function toAdminBranch(branch: BranchWithAdminRelations): AdminBranch {
  return {
    id: branch.id,
    branchName: branch.name,
    branchCode: branch.code,
    branchType: (BRANCH_TYPES as readonly string[]).includes(branch.branchType)
      ? (branch.branchType as BranchType)
      : 'company',
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    ipAddress: branch.ipAddress,
    loginPassword: branch.loginPassword ?? null,
    isActive: branch.isActive,
    zone: branch.zone
      ? { id: branch.zone.id, country: branch.zone.country, stateName: branch.zone.stateName }
      : null,
    createdBy: branch.createdByAdmin
      ? {
          id: branch.createdByAdmin.id,
          name: branch.createdByAdmin.name,
          email: branch.createdByAdmin.email,
        }
      : null,
    parent: branch.parent
      ? {
          id: branch.parent.id,
          branchName: branch.parent.name,
          branchCode: branch.parent.code,
        }
      : null,
    childCount: branch._count?.children ?? 0,
    additionalAddresses: (branch.addresses ?? []).map(toAdminBranchAddress),
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}
