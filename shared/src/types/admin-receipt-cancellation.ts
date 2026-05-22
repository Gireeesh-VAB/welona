export interface AdminReceiptCancellation {
  id: string;
  branch: { id: string; name: string; code: string } | null;
  customerName: string;
  packageNo: string | null;
  receiptNo: string;
  paidAmount: number;
  remarks: string | null;
  requestDate: string;
  status: string;
  ipAddress: string | null;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
