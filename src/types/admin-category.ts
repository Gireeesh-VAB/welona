import type { CategoryFlagKey } from '@/lib/admin-categories';

/** The boolean capability flags carried on every Category. */
export type CategoryFlags = Record<CategoryFlagKey, boolean>;

export interface AdminCategory extends CategoryFlags {
  id: string;
  name: string;
  categoryCode: string | null;
  description: string | null;
  isActive: boolean;
  /** Live count of services in this category. */
  serviceCount: number;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
