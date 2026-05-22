export interface AdminVoucherCancellation {
  id: string;
  branch: { id: string; name: string; code: string } | null;
  expenseType: string;
  amount: number;
  remarks: string | null;
  cancelReason: string | null;
  requestDate: string;
  status: string;
  ipAddress: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
