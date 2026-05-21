export interface AdminCancellationCustomer {
  id: string;
  name: string;
  mobileNo: string;
  gender: string | null;
  email: string | null;
  ipAddress: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
