import type { AdminUser, Branch, Zone } from '@prisma/client';
import type { AdminBranch } from '@/types/admin-branch';

/** Branch with the relations the admin UI needs. */
export type BranchWithAdminRelations = Branch & {
  zone: Zone | null;
  createdByAdmin: AdminUser | null;
};

/** Map a Prisma Branch (with relations) to the admin-side DTO shape. */
export function toAdminBranch(branch: BranchWithAdminRelations): AdminBranch {
  return {
    id: branch.id,
    branchName: branch.name,
    branchCode: branch.code,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    ipAddress: branch.ipAddress,
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
    createdAt: branch.createdAt.toISOString(),
    updatedAt: branch.updatedAt.toISOString(),
  };
}
