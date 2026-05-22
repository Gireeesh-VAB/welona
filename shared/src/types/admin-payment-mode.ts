export interface AdminPaymentMode {
  id: string;
  name: string;
  remarks: string | null;
  ipAddress: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
