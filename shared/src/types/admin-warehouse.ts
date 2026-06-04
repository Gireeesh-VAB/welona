export interface AdminWarehouse {
  id: string;
  branch: { id: string; name: string; code: string };
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
  /** Number of distinct products that currently have a stock row here. */
  productCount: number;
  createdAt: string;
  updatedAt: string;
}
