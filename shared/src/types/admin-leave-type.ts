export interface AdminLeaveType {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  paid: boolean;
  description: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}
