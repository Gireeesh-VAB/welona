// ── Service Assignment Rule ──────────────────────────────────────────────────

export interface AdminComplimentaryRule {
  id: string;
  name: string | null;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  services: { id: string; name: string }[];
  branches: { id: string; branchName: string; branchCode: string }[];
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Returned by the branch-accessible endpoint — services this branch can give free. */
export interface BranchComplimentaryRule {
  id: string;
  name: string | null;
  categoryId: string;
  categoryName: string;
  services: { id: string; name: string; minPrice: number; maxPrice: number }[];
}

// ── Branch Complimentary Limit ───────────────────────────────────────────────

export interface AdminBranchComplimentaryLimit {
  id: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  percentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What the staff-side endpoint returns for billing. */
export interface BranchComplimentaryConfig {
  /** Percentage configured by admin for this branch (0-100). Null if not configured. */
  branchPercentage: number | null;
  /** Whether the branch limit is active. */
  limitIsActive: boolean;
}
