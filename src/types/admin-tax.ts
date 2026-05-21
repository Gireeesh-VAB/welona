export interface AdminTax {
  id: string;
  name: string;
  /** Rate in basis points (250 = 2.5%, 1800 = 18%). */
  percentBps: number;
  remarks: string | null;
  ipAddress: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
