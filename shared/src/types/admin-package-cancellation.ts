export interface AdminPackageCancellation {
  id: string;
  branch: { id: string; name: string; code: string } | null;
  customerName: string;
  packageNo: string;
  amount: number; // paise
  remarks: string | null;
  requestedDate: string;
  status: string;
  ipAddress: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
