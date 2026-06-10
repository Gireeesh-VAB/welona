import type { AdminBranchAddress } from './admin-branch-address';
import type { BranchType } from '../enums';

/**
 * The admin-side view of a Branch — flattens the relations the admin UI
 * needs (zone name, creator name) so the table can render without extra
 * lookups. `address` is the legacy primary line kept for backwards
 * compatibility; `additionalAddresses` is the new multi-address list.
 */
export interface AdminBranch {
  id: string;
  branchName: string;
  branchCode: string;
  branchType: BranchType;
  address: string | null;
  phone: string | null;
  email: string | null;
  ipAddress: string | null;
  loginPassword: string | null;
  stateId: string | null;
  stateName: string | null;
  isActive: boolean;
  zone: {
    id: string;
    country: string;
    stateName: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  /** The branch this one sits under, or null for a top-level branch. */
  parent: {
    id: string;
    branchName: string;
    branchCode: string;
  } | null;
  /** Number of branches that have this branch as their parent. */
  childCount: number;
  additionalAddresses: AdminBranchAddress[];
  createdAt: string;
  updatedAt: string;
}
